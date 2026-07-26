// patch adapter for the live Definition-of-Done gate (L2, THIRD live-gate
// target — the SECOND genre, proving D5: the same target-agnostic gate
// drives KNOBS and PATCH CABLES, not rack buttons, and it still catches the
// same false-greens). Supplies the per-target hooks the universal harness
// (../live-gate.mjs) needs; the harness itself knows nothing about synths.
// The real backend is the generated scaffold at
// testing/backend/sources/patch/backend.mjs (reused unchanged), served
// same-origin by ./patch_bridge.mjs. See specs/definition-of-done.md (D5).
import { existsSync } from "node:fs";
import { start, TWIN_FILE } from "./patch_bridge.mjs";

export const name = "patch";
export const twinFile = TWIN_FILE;

// The patch backend and twin both ship inside this repo — available whenever
// the twin file exists.
export function available() {
  return existsSync(TWIN_FILE);
}

// boot() -> { baseUrl, raw(tool,args), teardown() }. Both the backend and the
// bridge are plain JS, so the bridge starts in-process — no subprocess. No
// auth: the bridge takes no token, so ctx.token is the empty string.
export async function boot() {
  const { baseUrl, teardown } = await start();
  const raw = async (tool, args) => {
    const r = await fetch(baseUrl + "/tool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, args }),
    });
    return r.json().catch(() => null);
  };
  return { baseUrl, token: "", raw, teardown };
}

// bootTwin(): the synth twin (examples/patch/twin.html) connects the moment
// it parses (same as notes) — no #tok field, no #connect button. A no-op,
// same reasoning as notes.mjs's bootTwin.
export async function bootTwin(_window, _doc, _ctx) {}

// G0 provenance: fetched from the SERVED bridge (GET /info), not an
// in-process import — so a stray mock answering on the same port could not
// silently satisfy this the way it could if we just called backend.info()
// directly ourselves.
export async function provenance(ctx) {
  const r = await fetch(ctx.baseUrl + "/info");
  const stamp = await r.json().catch(() => null);
  const ok = !!stamp && stamp.generated === true && stamp.class === "scaffold";
  return {
    ok,
    detail: stamp
      ? `${stamp.name} · generated:${stamp.generated} · source:${stamp.source}`
      : "no provenance stamp served at /info",
  };
}

// patch has no folder/scope concept, so the fixture is a trivial marker (same
// pattern as notes/urlshortener) — real writes the gate drives land in the
// same fixed small rack the bridge boots (two oscillators, one filter, one
// factory connection). Witness measures DELTAS between calls, so the
// pre-existing factory connection never affects G3/G4/G5/G6b.
export async function fixture(_ctx) {
  return { scope: "gate-" + Date.now() };
}

// witness(): out-of-band, monotonic observable of real state — `rev`, part
// of the real state `patch.list` returns (see manual.md's "Witness"
// section), read through the harness's own raw() call, a channel the twin's
// own DOM never touches. It advances by exactly 1 on every op that actually
// changes a parameter or the connection set, and never on a refusal — so it
// is a faithful stand-in for "the real out-of-band state changed" whether
// the change came from a knob-turn or a cable-patch.
export async function witness(ctx, _fx) {
  const r = await ctx.raw("patch", { op: "list", params: {} });
  return r && typeof r.rev === "number" ? r.rev : -1;
}

// Representative nodes the gate drives through the twin, matched by the
// EXACT data-op value (never by visible label/text — skill/SKILL.md's
// Control grammar). `write` drives the TURN gesture (a knob: osc.setFreq);
// `write2` drives the PATCH gesture (a cable: patch.connect) — so G3 and G4
// between them exercise BOTH new gestures, not just one. `destructive`
// drives the PATCH gesture again, this time removing the factory connection
// (patch.disconnect), gated by the typed-name confirm (G6b).
export function probes(_fx) {
  return {
    write: { control: "osc.setFreq", params: { module: "osc1", hz: "523" }, expectDelta: 1 },
    write2: { control: "patch.connect", params: { from: "osc2.out", to: "filter1.in" }, expectDelta: 1 },
    // an unknown oscillator module: the backend must refuse
    // ({ok:false,error:"unknown oscillator module ..."}), and the twin must
    // show that refusal, not a fabricated success — driven through the same
    // TURN gesture as `write`, so G5 proves honesty-on-failure for a knob,
    // not just for a button.
    refuse: { control: "osc.setFreq", params: { module: "does-not-exist", hz: "440" } },
    // the factory connection (osc1.out -> filter1.in) exists from
    // construction (backend.mjs), so this is safe to drive at any point in
    // the run — removing it drops the connection count by one but still
    // advances the monotonic rev by exactly 1.
    destructive: { control: "patch.disconnect", params: { from: "osc1.out", to: "filter1.in" }, expectDelta: 1 },
  };
}

// --- optional: completeness sweep support (G2 read causation + `--all`) ---
export async function catalogue(_ctx) {
  return [
    { facade: "osc", op: "setFreq", name: "osc.setFreq", mutates: true, required: ["module", "hz"] },
    { facade: "filter", op: "setCutoff", name: "filter.setCutoff", mutates: true, required: ["module", "hz"] },
    { facade: "patch", op: "connect", name: "patch.connect", mutates: true, required: ["from", "to"] },
    { facade: "patch", op: "disconnect", name: "patch.disconnect", mutates: true, required: ["from", "to"] },
    { facade: "patch", op: "list", name: "patch.list", mutates: false, required: [] },
  ];
}

// A read op the gate can drive through the twin for a facade's live sweep:
// only `patch.list` is a read with zero required params; `osc` and `filter`
// have no such op (both their only ops mutate) — readProbe honestly returns
// null for those, named (not skipped) in the --all sweep, same convention as
// urlshortener.mjs.
export function readProbe(catRows, facade, _fx) {
  const op = catRows.find((r) => r.facade === facade && !r.mutates && r.required.length === 0);
  if (!op) return null;
  return { control: op.name, params: {} };
}
