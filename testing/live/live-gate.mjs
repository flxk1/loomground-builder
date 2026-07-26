// Live Definition-of-Done gate (L2). Proves a generated twin actually controls
// the real backend: it loads the twin against a really-booted server, drives
// controls through the twin's own DOM, and asserts the real backend state
// changed — verified out-of-band, through a channel the twin never touches.
// Target-agnostic; all target specifics come from an adapter (default: notes).
// See specs/definition-of-done.md for the property set (G0..G6).
//
// Controls are located and driven purely through the Control grammar
// (skill/SKILL.md's "Control grammar" section): data-op identifies the
// control, data-param identifies each of its parameter fields, and
// data-gesture NAMES what invokes it — a free, genre-chosen word (activate,
// turn, patch, fade, pan, trigger, route, mute, ...). This harness never
// enumerates that vocabulary and never falls back to a control's visible
// label/text: it dispatches on STRUCTURE, not on which word a genre picked —
// "activate" opens a shared op-surface (the rack pattern), anything else
// fires the control's own local fields directly (the knob/cable/fader/pan/
// transport pattern) — so form-independence (a rack button, a knob, a cable
// endpoint, a fader, a room-tile) is exactly what that buys for every
// catalogued genre.
//
//   node testing/live/live-gate.mjs            # uses adapters/notes.mjs
//   TWIN_ADAPTER=./adapters/foo.mjs node ...    # any other target
//
// Exits non-zero on any failed property. If the adapter reports no target
// backend present, it SKIPS (exit 0) so the universal repo gates with zero
// target code.
//
// runGate() is the reusable entry (used directly and by the conformance kit,
// ../../bin/conformance.mjs); the bottom of this file is a thin CLI wrapper
// that calls it and reproduces today's console output and exit code exactly.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { loadAuthorizedAdapter, moduleDirectory } from "../adapter-loader.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// runGate(opts) -> { mode, adapter, properties, completeness, verdict }
//   opts.adapterPath  — defaults to TWIN_ADAPTER env, then ./adapters/notes.mjs
//   opts.adapterRoots — authorized local roots (conformance supplies these)
//   opts.all          — also run the --all completeness sweep
//   opts.print        — mirror today's console output (default false)
export async function runGate(opts = {}) {
  const adapterPath = opts.adapterPath || process.env.TWIN_ADAPTER || "./adapters/notes.mjs";
  const all = !!opts.all;
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
    const detail = "no target backend present for adapter '" + adapterName + "' — the adapter's available() check found nothing to gate against.";
    if (print) console.log("SKIP: " + detail);
    return { mode: "live", adapter: adapterName, properties: [], completeness: null, verdict: "skip", detail };
  }

  // --- Control grammar DOM driving (universal to any twin built on the
  // sheet, and to any other genre's controls that carry the same three
  // attributes — see skill/SKILL.md's "Control grammar" section). A
  // control's identity is data-op, never its visible label/text; its
  // gesture is data-gesture, a free genre-chosen name the gate never
  // enumerates (see driveOp below); its params are found by data-param,
  // never by field-label text. ---
  function fillParams(surface, params) {
    const fields = [...surface.querySelectorAll("[data-param]")];
    const used = new Set();
    for (const [pname, val] of Object.entries(params)) {
      let field = fields.find((f, i) => !used.has(i) && f.getAttribute("data-param") === pname && (used.add(i) || true));
      if (!field) { const i = fields.findIndex((_, i) => !used.has(i)); if (i !== -1) { used.add(i); field = fields[i]; } }
      if (field) { field.value = val; field.dispatchEvent(new surface.ownerDocument.defaultView.Event("input")); }
    }
  }

  async function driveOp(window, doc, probe) {
    const btn = [...doc.querySelectorAll("[data-op]")].find((b) => b.getAttribute("data-op") === probe.control);
    if (!btn) return { ok: false, reason: "no control for " + probe.control };
    // The gesture named on the control (data-gesture) decides how the gate
    // drives it — a small switch, never a per-target special case (SKILL.md's
    // Control grammar section). Every branch ends the same way: whatever the
    // gesture did, a confirm dialog (.tw-dialog) may now be open, and the
    // shared handling below deals with it identically regardless of gesture.
    const gesture = btn.getAttribute("data-gesture") || "activate";
    // The gate dispatches on STRUCTURE, not on an enumerated gesture list —
    // exactly two mechanisms exist, and the gesture VALUE never selects
    // between them beyond the one check below (SKILL.md's Control grammar
    // section: "the gesture vocabulary is open"). Every branch ends the same
    // way: whatever the gesture did, a confirm dialog (.tw-dialog) may now
    // be open, and the shared handling below deals with it identically
    // regardless of gesture.
    // responseScope: where THIS control's response/error renders, once fired
    // — scoped per gesture, never doc-wide, so a stale response left behind
    // by an earlier probe (in a different rack row's surface, or a
    // different knob's own slot) can never be mistaken for this call's
    // outcome. Every branch below sets it before firing.
    let responseScope = doc;
    if (gesture === "activate") {
      // The SURFACE mechanism: a rack button (or any control that opens a
      // shared op-surface panel before it can be filled): click to open,
      // fill the surface's own data-param fields, click its primary button
      // to compose/run.
      btn.dispatchEvent(new window.MouseEvent("click"));
      await sleep(40);
      const surface = doc.querySelector(".tw-opsurface");
      if (!surface) return { ok: false, reason: "op surface did not open" };
      responseScope = surface;
      fillParams(surface, probe.params);
      surface.querySelector(".tw-btn.primary").dispatchEvent(new window.MouseEvent("click"));
      await sleep(40);
    } else {
      // The DIRECT mechanism: every gesture that is not "activate" — a
      // knob's "turn", a cable's "patch", a fader's "fade", a pan control's
      // "pan", a transport button's "trigger", a mute toggle's "mute", a
      // routing control's "route", or any other name a future genre
      // chooses. The gate does not enumerate these; it only knows that a
      // control whose gesture isn't "activate" carries its own params
      // locally rather than behind a click-to-open panel, so: find the
      // data-param fields scoped to THIS control's own group (never
      // doc-wide — a twin may render several such controls sharing the same
      // data-op, e.g. one fader per track or one knob per module, and only
      // the driven one's fields must be touched), fill them with the
      // probe's values, then fire the control itself. The response this
      // fire produces also renders inside that same group (the widget's own
      // slot), so it is the scope errShown reads below, too.
      const group = btn.closest("[data-control-group]") || btn.parentElement || doc;
      responseScope = group;
      fillParams(group, probe.params);
      btn.dispatchEvent(new window.MouseEvent("click"));
      await sleep(40);
    }
    // From here on, gesture-independent: a mutating op — whatever gesture
    // fired it — confirm-gates the same way (twin-sheet.js confirmGate),
    // fail-closed, so this handling is shared by every branch above.
    const dialog = doc.querySelector(".tw-dialog");
    if (dialog) {
      // Destructive ops gate on typing the function name; satisfy it if
      // present. The sheet's confirmGate (skill/sheet/twin-sheet.js) checks
      // the typed value against the FULL fn.name, and probe.control is
      // matched against data-op — the same "facade.op" identifier
      // (skill/SKILL.md's Control grammar) — so the full probe.control is
      // what must be typed, not its last segment. Target-agnostic: no
      // per-target logic here.
      const okBtn = [...dialog.querySelectorAll("button")].find((b) => !/cancel/i.test(b.textContent))
        || dialog.querySelector(".tw-btn.primary, .tw-btn.danger");
      if (okBtn && okBtn.disabled) {
        const gate = dialog.querySelector(".tw-field input");
        if (gate) { gate.value = probe.control; gate.dispatchEvent(new window.Event("input")); }
      }
      // A real user cannot activate a disabled button; jsdom's dispatchEvent
      // does not enforce that on its own, so enforce it here — if the
      // typed-name gate never actually enabled (right control typed, wrong
      // one, or none), back out via Cancel instead of forcing the click.
      // This is what makes the typed-name gate load-bearing in this harness.
      if (okBtn && okBtn.disabled) {
        const cancelBtn = [...dialog.querySelectorAll("button")].find((b) => /cancel/i.test(b.textContent));
        if (cancelBtn) cancelBtn.dispatchEvent(new window.MouseEvent("click"));
        return { ok: false, reason: "confirm blocked: typed-name gate never enabled for " + probe.control, hadConfirm: true };
      }
      okBtn.dispatchEvent(new window.MouseEvent("click"));
      await sleep(50);
    }
    await sleep(250);
    // Read the response from the SAME scope the control fired into (the
    // opened op-surface for "activate", this control's own widget group for
    // "turn"/"patch") — never doc-wide, for the same reason responseScope
    // itself is scoped above. .tw-response/.tw-response.error is the one
    // rendering contract every gesture shares (twin-sheet.js opSurface and
    // any genre kit built on it, e.g. skill/genres/synth/synth-kit.js).
    const errShown = !!responseScope.querySelector(".tw-response.error") || /error|unknown|refus/i.test((responseScope.querySelector(".tw-response")?.textContent) || "");
    return { ok: true, errShown, hadConfirm: !!dialog };
  }

  // --- boot real backend + load the twin against it ---
  const ctx = await A.boot();
  let completeness = null;
  try {
    // G0 · provenance
    const prov = await A.provenance(ctx);
    ok(prov.ok, "G0 provenance: booted server is the real target", prov.detail, "G0");

    // The adapter's declared mental model — the ground truth for G1 below.
    // No per-target constant here: "the twin loaded the live catalogue" means
    // the twin's rack has at least as many controls as the backend's own real
    // surface, whatever size that surface happens to be.
    const cat = await A.catalogue(ctx);

    const html = readFileSync(A.twinFile, "utf8");
    const dom = new JSDOM(html, {
      runScripts: "dangerously", pretendToBeVisual: true,
      beforeParse(w) {
        w.fetch = (u, o) => fetch(new URL(u, ctx.baseUrl), o);
        w.HTMLElement.prototype.scrollIntoView = function () {};
      },
    });
    const { window } = dom; const doc = window.document;
    await sleep(120);
    // The one target-specific assumption in this harness: how the twin gets
    // from "just parsed" to "connected." Different twins need different things
    // (some fill a token field and click connect; others auto-connect on
    // load) — so the adapter supplies the hook and the harness stays
    // target-agnostic.
    await A.bootTwin(window, doc, ctx);
    // Controls are counted and matched by the Control grammar's data-op
    // attribute — not "#rack button" and not visible text. This is what
    // makes the count (and the completeness check below) genre-independent:
    // a knob, a cable endpoint, or a room-tile all count here the same way
    // a rack button does, as long as it carries data-op.
    let ops = [];
    for (let i = 0; i < 80; i++) { await sleep(100); ops = [...doc.querySelectorAll("[data-op]")]; if (ops.length >= cat.length) break; }
    ok(ops.length >= cat.length, "G1 reachability: twin loaded the live catalogue",
      `${ops.length} [data-op] controls ≥ ${cat.length} catalogued ops`, "G1");

    // Delta-zero completeness (uniform across the conformance kit): which
    // catalogued ops actually have a reachable control, named, not just
    // counted. Cheap — reuses the catalogue and controls already fetched for
    // G1 above; computed on every run, not only --all. Matched by the exact
    // data-op value, never by scanning a control's visible label/text.
    const controlOps = ops.map((b) => b.getAttribute("data-op"));
    const missingOps = cat.filter((op) => !controlOps.includes(op.name));
    completeness = { covered: cat.length - missingOps.length, total: cat.length, missing: missingOps.map((m) => m.name) };

    // G3 · write causation, and G4 · stub-defeat (two distinct writes advance the witness)
    const fx = await A.fixture(ctx);
    const P = A.probes(fx);
    const w0 = await A.witness(ctx, fx);
    const r1 = await driveOp(window, doc, P.write);
    const w1 = await A.witness(ctx, fx);
    ok(r1.ok && w1 - w0 === P.write.expectDelta, "G3 write causation: twin-driven write changed real backend state", `witness ${w0} -> ${w1}`, "G3");
    ok(r1.hadConfirm, "G6 mutation-safety: the mutating write confirm-gated before firing", null, "G6");

    const r2 = await driveOp(window, doc, P.write2);
    const w2 = await A.witness(ctx, fx);
    ok(r2.ok && w2 - w1 === P.write2.expectDelta && w2 > w1 && w1 > w0,
      "G4 stub-defeat: a second, different write advanced the monotonic witness again", `witness ${w1} -> ${w2}`, "G4");

    // G6b · destructive typed-name gate, driven for real (optional — only
    // when the adapter supplies P.destructive; most adapters don't, and
    // nothing here is target-specific). Proves the fix above: the sheet's
    // confirmGate types-in-the-full-fn.name gate actually unlocks and the
    // op actually fires against the real backend, not just that the DOM
    // looked satisfied.
    if (P.destructive) {
      const wD0 = await A.witness(ctx, fx);
      const rd = await driveOp(window, doc, P.destructive);
      const wD1 = await A.witness(ctx, fx);
      ok(rd.ok && !rd.errShown, "G6b destructive confirm: typed-name gate satisfied, op fired without error", null, "G6b");
      ok(wD1 - wD0 === P.destructive.expectDelta,
        "G6b (cont.): the destructive op actually changed real backend state", `witness ${wD0} -> ${wD1}`, "G6b-witness");
    }

    // G5 · honesty on failure: a refused call shows failure in the twin and writes nothing
    const wBefore = await A.witness(ctx, fx);
    const rr = await driveOp(window, doc, P.refuse);
    const wAfter = await A.witness(ctx, fx);
    ok(rr.ok && rr.errShown, "G5 honesty on failure: twin surfaced the backend's refusal", null, "G5");
    ok(wAfter === wBefore, "G5 (cont.): a refused write left the real chain unchanged", `witness stayed ${wBefore}`, "G5b");

    // --all · completeness: every op has a control, and every facade's live read
    // path is exercised — chunked by facade, with any uncovered op named.
    // Reuses `cat`, already fetched once for G1 above.
    if (all) {
      if (print) console.log("\n-- completeness sweep (--all) --");
      ok(missingOps.length === 0,
        `completeness: every catalogued op has a control (${completeness.covered}/${completeness.total})`,
        missingOps.length ? "missing: " + completeness.missing.join(", ") : "", "completeness");

      const facades = [...new Set(cat.map((r) => r.facade))];
      let swept = 0; const undriveable = [], failedFacades = [];
      for (const f of facades) {
        const probe = A.readProbe ? A.readProbe(cat, f, fx) : null;
        if (!probe) { undriveable.push(f); if (print) console.log(`   --   ${f}: no trivial read op (named, not skipped)`); continue; }
        // out-of-band disposition of the same op (the ground truth the twin must reflect)
        const [facade, ...opParts] = probe.control.split(".");
        const oob = await ctx.raw(facade, { op: opParts.join("."), params: probe.params });
        const backendErr = !oob || oob.error !== undefined || oob.ok === false;
        const r = await driveOp(window, doc, probe);
        // G2 read causation: the twin reached the live backend AND its shown
        // disposition (ok vs error) matches the backend's — a faithfully shown
        // real error is correct reflection, a fake success on a real error is not.
        const good = r.ok && r.errShown === backendErr;
        if (print) console.log(`   ${good ? "ok  " : "FAIL"} ${f} · ${probe.control} (backend ${backendErr ? "error" : "ok"}, twin ${r.errShown ? "error" : "ok"})`);
        if (good) swept++; else failedFacades.push(f);
      }
      const drivable = facades.length - undriveable.length;
      ok(swept === drivable,
        `read-causation sweep: ${swept}/${drivable} facades drove a live read (chunked by facade)`,
        (undriveable.length ? `no-trivial-read: ${undriveable.join(", ")}` : "") + (failedFacades.length ? ` | failed: ${failedFacades.join(", ")}` : ""),
        "G2-sweep");
    }

    if (print) console.log(`\nLIVE GATE ${fail ? "FAIL" : "PASS"} — ${pass} passed, ${fail} failed`);
  } finally {
    ctx.teardown();
  }

  return { mode: "live", adapter: adapterName, properties, completeness, verdict: fail ? "fail" : "pass" };
}

// --- CLI entry: unchanged behaviour (same output, same exit code) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runGate({ all: process.argv.includes("--all"), print: true });
  process.exit(result.verdict === "fail" ? 1 : 0);
}
