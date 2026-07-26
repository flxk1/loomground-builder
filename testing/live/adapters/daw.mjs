// daw adapter for the live Definition-of-Done gate (L2, FOURTH live-gate
// target — the THIRD genre, proving D5 for a second time: the same
// target-agnostic gate drives a TRANSPORT BAR, FADERS, PAN CONTROLS, MUTE
// TOGGLES, and a ROUTING assignment — none of them rack buttons, none of
// them knobs/cables — and it still catches the same false-greens. This is
// also the first adapter authored against the OPENED gesture vocabulary
// (testing/live/live-gate.mjs's driveOp): the DAW genre names its own
// gestures (trigger, fade, pan, mute, route) and the gate drives every one of
// them through the same "activate vs direct" dispatch, never an enumerated
// gesture list. Supplies the per-target hooks the universal harness
// (../live-gate.mjs) needs; the harness itself knows nothing about mixers.
// The real backend is the generated scaffold at
// testing/backend/sources/mix/backend.mjs (reused unchanged), served
// same-origin by ./daw_bridge.mjs. See specs/definition-of-done.md (D5).
import { existsSync } from "node:fs";
import { start, TWIN_FILE } from "./daw_bridge.mjs";

export const name = "daw";
export const twinFile = TWIN_FILE;

// The mix backend and DAW twin both ship inside this repo — available
// whenever the twin file exists.
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

// bootTwin(): the DAW twin (examples/daw/twin.html) connects the moment it
// parses (same as notes/patch) — no #tok field, no #connect button. A
// no-op, same reasoning as notes.mjs's bootTwin.
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

// mix has no folder/scope concept, so the fixture is a trivial marker (same
// pattern as notes/urlshortener/patch) — real writes the gate drives land in
// the same fixed small mixer the bridge boots (three tracks, two buses, one
// factory route). Witness measures DELTAS between calls, so the pre-existing
// factory route never affects G3/G4/G5/G6b.
export async function fixture(_ctx) {
  return { scope: "gate-" + Date.now() };
}

// witness(): out-of-band, monotonic observable of real state — `rev`, part
// of the real state `mix.state` returns (see manual.md's "Witness" section),
// read through the harness's own raw() call, a channel the twin's own DOM
// never touches. It advances by exactly 1 on every op that actually changes
// state, and never on a refusal or a same-value no-op — so it is a faithful
// stand-in for "the real out-of-band state changed" whether the change came
// from a fader-fade, a mute-flip, or a route/unroute.
export async function witness(ctx, _fx) {
  const r = await ctx.raw("mix", { op: "state", params: {} });
  return r && typeof r.rev === "number" ? r.rev : -1;
}

// Representative nodes the gate drives through the twin, matched by the
// EXACT data-op value (never by visible label/text — skill/SKILL.md's
// Control grammar). `write` drives the FADE gesture (a fader:
// track.setGain); `write2` drives the MUTE gesture (a toggle: track.mute) —
// so G3 and G4 between them exercise two of the DAW's own gesture names, not
// the synth's turn/patch and not the rack's activate. `refuse` drives FADE
// again (an unknown track), proving honesty-on-failure for a fader, not just
// a knob or a button. `destructive` drives the ROUTE gesture, removing the
// factory route (mix.unroute), gated by the typed-name confirm (G6b).
export function probes(_fx) {
  return {
    write: { control: "track.setGain", params: { track: "t2", db: "-6" }, expectDelta: 1 },
    write2: { control: "track.mute", params: { track: "t3" }, expectDelta: 1 },
    // an unknown track: the backend must refuse
    // ({ok:false,error:"unknown track ..."}), and the twin must show that
    // refusal, not a fabricated success — driven through the same FADE
    // gesture as `write`.
    refuse: { control: "track.setGain", params: { track: "does-not-exist", db: "0" } },
    // the factory route (t1 -> busA) exists from construction (backend.mjs),
    // so this is safe to drive at any point in the run — removing it drops
    // the route count by one but still advances the monotonic rev by
    // exactly 1.
    destructive: { control: "mix.unroute", params: { track: "t1", bus: "busA" }, expectDelta: 1 },
  };
}

// --- optional: completeness sweep support (G2 read causation + `--all`) ---
export async function catalogue(_ctx) {
  return [
    { facade: "transport", op: "play", name: "transport.play", mutates: true, required: [] },
    { facade: "transport", op: "stop", name: "transport.stop", mutates: true, required: [] },
    { facade: "track", op: "setGain", name: "track.setGain", mutates: true, required: ["track", "db"] },
    { facade: "track", op: "setPan", name: "track.setPan", mutates: true, required: ["track", "pos"] },
    { facade: "track", op: "mute", name: "track.mute", mutates: true, required: ["track"] },
    { facade: "mix", op: "route", name: "mix.route", mutates: true, required: ["track", "bus"] },
    { facade: "mix", op: "unroute", name: "mix.unroute", mutates: true, required: ["track", "bus"] },
    { facade: "mix", op: "state", name: "mix.state", mutates: false, required: [] },
  ];
}

// A read op the gate can drive through the twin for a facade's live sweep:
// only `mix.state` is a read with zero required params; `transport` and
// `track` have no such op (every one of their ops mutates) — readProbe
// honestly returns null for those, named (not skipped) in the --all sweep,
// same convention as patch.mjs's osc/filter facades.
export function readProbe(catRows, facade, _fx) {
  const op = catRows.find((r) => r.facade === facade && !r.mutates && r.required.length === 0);
  if (!op) return null;
  return { control: op.name, params: {} };
}
