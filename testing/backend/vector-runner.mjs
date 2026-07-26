// Data-driven conformance-vector runner. A vector is given/when/then data (see
// a source's vectors.json), not adapter code, so a manual's stated behaviours
// travel as a declarative artifact the gate interprets. Universal — knows no
// source. Used by backend-gate.mjs for B2, chunked by the vectors' `domain`.
//
// Vector shape:
//   { "domain": "<group>", "name": "<human name>",
//     "steps": [ { "op", "args"?, "bind"? } ],   // setup calls; bind names a result
//     "when":  { "op", "args"? },                  // the action; its response is asserted
//     "then":  [ { "path"?, "equals" | "contains" } ],
//     "check": [ { "op", "args"?, "then": [ ... ] } ] }  // optional follow-up reads
//
// `$name` or `$name.path` in any args or expected value resolves to a bound
// result. Assertions: `equals` (deep) and `contains` (array holds an element
// matching the given subset). Calls are awaited, so sync and async backends
// both work.

function getPath(obj, path) {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function isRef(v) { return typeof v === "string" && /^\$[A-Za-z_]\w*(\.\w+)*$/.test(v); }
function resolve(v, bind) {
  if (isRef(v)) { const [head, ...rest] = v.slice(1).split("."); return getPath(bind[head], rest.join(".")); }
  if (Array.isArray(v)) return v.map((x) => resolve(x, bind));
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = resolve(v[k], bind); return o; }
  return v;
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function subsetMatch(el, exp) {
  return el && typeof el === "object" && Object.keys(exp).every((k) => eq(el[k], exp[k]));
}
function assertOne(resp, a, bind) {
  const actual = getPath(resp, a.path);
  if ("equals" in a) return eq(actual, resolve(a.equals, bind));
  if ("contains" in a) { const exp = resolve(a.contains, bind); return Array.isArray(actual) && actual.some((el) => subsetMatch(el, exp)); }
  return false;
}

export async function runVector(ctx, v) {
  const bind = {};
  try {
    for (const s of v.steps || []) {
      const r = await ctx.call(s.op, resolve(s.args || {}, bind));
      if (s.bind) bind[s.bind] = r;
    }
    const it = await ctx.call(v.when.op, resolve(v.when.args || {}, bind));
    for (const a of v.then || []) if (!assertOne(it, a, bind)) return { ok: false, why: `then ${JSON.stringify(a)} on ${JSON.stringify(it).slice(0, 100)}` };
    for (const c of v.check || []) {
      const r = await ctx.call(c.op, resolve(c.args || {}, bind));
      for (const a of c.then || []) if (!assertOne(r, a, bind)) return { ok: false, why: `check ${c.op} ${JSON.stringify(a)} on ${JSON.stringify(r).slice(0, 100)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: "threw: " + (e && e.message || e) };
  }
}

// Run all vectors grouped by `domain`, in chunks. Returns per-chunk counts and
// the list of failures (each named), so the caller can report progress and
// never silently cap.
export async function runChunked(ctx, vectors, onChunk) {
  const domains = [...new Set(vectors.map((v) => v.domain || "default"))];
  let passed = 0; const failures = [];
  for (const d of domains) {
    const chunk = vectors.filter((v) => (v.domain || "default") === d);
    let cp = 0;
    for (const v of chunk) {
      const r = await runVector(ctx, v);
      if (r.ok) { cp++; passed++; } else failures.push(`${d}/${v.name}: ${r.why}`);
    }
    if (onChunk) onChunk(d, cp, chunk.length);
  }
  return { passed, total: vectors.length, failures };
}
