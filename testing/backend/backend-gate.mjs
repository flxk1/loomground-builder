// Backend gate — the inverse of the live twin gate. Proves a backend GENERATED
// from a source (manual/description) actually conforms to it: it exposes the
// declared surface, behaves as the source states, and is internally causal.
// Target-agnostic; all source specifics come from an adapter (default: notes).
// See specs/backend-from-model.md for the property set (B0..B3).
//
//   node testing/backend/backend-gate.mjs                 # uses adapters/notes.mjs
//   BACKEND_ADAPTER=./adapters/foo.mjs node ...            # any other source
//
// Exits non-zero on any failed property. Skips (exit 0) when the adapter reports
// no generated backend present.
//
// runGate() is the reusable entry (used directly and by the conformance kit,
// ../../bin/conformance.mjs); the bottom of this file is a thin CLI wrapper
// that calls it and reproduces today's console output and exit code exactly.
import { readFileSync } from "node:fs";
import { runChunked } from "./vector-runner.mjs";
import { loadAuthorizedAdapter, moduleDirectory } from "../adapter-loader.mjs";

// The provenance-stamp contract for a shipped generated backend
// (specs/backend-from-model.md). Fail-closed: a missing field, a class outside
// {scaffold, mock}, or any claim to be a trusted enforcement point is rejected.
function validateStamp(s) {
  const p = [];
  if (!s || typeof s !== "object") return ["no stamp"];
  if (s.generated !== true) p.push("generated must be true");
  if (!s.source) p.push("source missing");
  if (!s.generator) p.push("generator missing");
  if (!["scaffold", "mock"].includes(s.class)) p.push(`class must be scaffold|mock (got ${JSON.stringify(s.class)})`);
  if (s.enforcement_point !== false) p.push("enforcement_point must be false — a generated backend is never a trusted enforcement point");
  if (!s.notice) p.push("notice missing");
  return p;
}
const canon = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1))));

// runGate(opts) -> { mode, adapter, properties, completeness, verdict }
//   opts.adapterPath  — defaults to BACKEND_ADAPTER env, then ./adapters/notes.mjs
//   opts.adapterRoots — authorized local roots (conformance supplies these)
//   opts.print        — mirror today's console output (default false)
export async function runGate(opts = {}) {
  const adapterPath = opts.adapterPath || process.env.BACKEND_ADAPTER || "./adapters/notes.mjs";
  const print = !!opts.print;
  const adapterRoots = opts.adapterRoots || [moduleDirectory(import.meta.url)];
  const A = await loadAuthorizedAdapter(adapterPath, {
    baseUrl: import.meta.url,
    roots: adapterRoots,
  });
  const adapterName = A.name || adapterPath;

  const properties = [];
  let pass = 0, fail = 0;
  const ok = (cond, name, detail, id) => {
    cond = !!cond;
    if (cond) pass++; else fail++;
    properties.push({ id: id || name, name, pass: cond, detail: detail ?? null });
    if (print) {
      if (cond) console.log("ok   " + name + (detail ? "  — " + detail : ""));
      else console.error("FAIL " + name + (detail ? "  — " + detail : ""));
    }
    return cond;
  };

  if (!A.available()) {
    const detail = "no generated backend present for source '" + adapterName + "'.";
    if (print) console.log("SKIP: " + detail);
    return { mode: "backend", adapter: adapterName, properties: [], completeness: null, verdict: "skip", detail };
  }

  const ctx = await A.boot();
  let completeness = null;
  try {
    // B0 · provenance stamp — the shipped generated backend carries the full
    // stamp and can never claim to be a trusted enforcement point (fail-closed).
    const stamp = ctx.info();
    const problems = validateStamp(stamp);
    ok(problems.length === 0, "B0 provenance stamp: complete and declares non-enforcement",
      problems.length ? problems.join("; ") : `${stamp.name} · ${stamp.class} · enforcement_point:${stamp.enforcement_point}`, "B0");

    // B0b · the shipped stamp artifact matches the runtime stamp.
    if (A.stampFile) {
      let shipped = null, err = null;
      try { shipped = JSON.parse(readFileSync(A.stampFile, "utf8")); } catch (e) { err = String(e.message || e); }
      ok(!!shipped && canon(shipped) === canon(stamp), "B0b shipped provenance.json matches the runtime stamp",
        err || (shipped ? "" : "stamp file unreadable"), "B0b");
    }

    const surface = A.surface();

    // B1 · surface conformance — every declared op is really implemented (not a
    // catalogue entry with no handler). Completeness: all declared ops, or named.
    const missing = [];
    for (const s of surface) {
      const args = A.sampleArgs ? A.sampleArgs(ctx, s.op) : {};
      const r = ctx.call(s.op, args);
      if (r && typeof r.error === "string" && /unknown op/i.test(r.error)) missing.push(s.op);
    }
    ok(missing.length === 0, `B1 surface conformance: every declared op is implemented (${surface.length - missing.length}/${surface.length})`,
      missing.length ? "missing: " + missing.join(", ") : "", "B1");

    // Delta-zero completeness (uniform across the conformance kit): every
    // declared op is implemented, or named. Reuses B1's own pass over the
    // surface — no extra work, never a silent cap.
    completeness = { covered: surface.length - missing.length, total: surface.length, missing: [...missing] };

    // B1b · mutation-class conformance — a declared read leaves state unchanged;
    // a declared write changes it. Ties the model's mutation class to reality.
    if (A.fingerprint) {
      const wrong = [];
      for (const s of surface) {
        const args = A.sampleArgs ? A.sampleArgs(ctx, s.op) : {};   // may create a fixture (a write) — done before we measure
        const before = A.fingerprint(ctx);
        ctx.call(s.op, args);
        const changed = A.fingerprint(ctx) !== before;
        if (s.mutates && !changed) wrong.push(s.op + " (declared write, changed nothing)");
        if (!s.mutates && changed) wrong.push(s.op + " (declared read, mutated state)");
      }
      ok(wrong.length === 0, "B1b mutation-class conformance: reads don't mutate, writes do", wrong.length ? wrong.join("; ") : "", "B1b");
    }

    // B2 · behavioural conformance — the source's stated behaviours hold. Data
    // vectors (given/when/then from vectors.json) are interpreted and run in
    // chunks by domain; a source may instead supply code vectors (fallback).
    if (A.vectorsFile) {
      const vectors = JSON.parse(readFileSync(A.vectorsFile, "utf8"));
      const res = await runChunked(ctx, vectors, (d, cp, ct) => { if (print) console.log(`   chunk ${d}: ${cp}/${ct}`); });
      ok(res.failures.length === 0, `B2 behavioural conformance (data vectors, ${new Set(vectors.map((v) => v.domain || "default")).size} domains): ${res.passed}/${res.total}`,
        res.failures.length ? res.failures.join(" | ") : "", "B2");
    } else if (A.vectors) {
      const vecs = A.vectors(ctx);
      const vfail = [];
      for (const v of vecs) { let good = false; try { good = !!v.run(); } catch { good = false; } if (!good) vfail.push(v.name); }
      ok(vfail.length === 0, `B2 behavioural conformance: ${vecs.length - vfail.length}/${vecs.length} source vectors hold`,
        vfail.length ? "failed: " + vfail.join("; ") : "", "B2");
    }

    // B3 · self-consistency — a write is observable by a read (the backend's own
    // witness advances).
    const w0 = A.witness(ctx);
    A.write(ctx);
    const w1 = A.witness(ctx);
    ok(w1 > w0, "B3 self-consistency: a write is observable by a read", `witness ${w0} -> ${w1}`, "B3");

    if (print) console.log(`\nBACKEND GATE ${fail ? "FAIL" : "PASS"} — ${pass} passed, ${fail} failed`);
  } finally {
    ctx.teardown && ctx.teardown();
  }

  return { mode: "backend", adapter: adapterName, properties, completeness, verdict: fail ? "fail" : "pass" };
}

// --- CLI entry: unchanged behaviour (same output, same exit code) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runGate({ print: true });
  process.exit(result.verdict === "fail" ? 1 : 0);
}
