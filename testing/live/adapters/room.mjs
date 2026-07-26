// room adapter for the live Definition-of-Done gate (L2, FIFTH live-gate
// target — the FOURTH genre, proving D5 for a third time AND proving D6: the
// same target-agnostic gate drives STATION DIALS, DOOR STEP TOGGLES, and an
// ADJACENCY-LINK control — none of them rack buttons, none of them
// knobs/cables, none of them a transport bar/fader/pan/mute/route — and it
// still catches the same false-greens. The room's controls are real DOM
// elements positioned in 3D space by CSS transforms only (spatial-kit.css) —
// no Three.js, no WebGL, no <canvas> — which is what makes them reachable at
// all by this jsdom-based harness: jsdom has no CSS layout engine, so
// driving this twin through it IS driving the "text" layer of the room's
// lossless 3D->2D->text degrade (see examples/room/twin.html's D6 note and
// testing/live/room-d6.mjs, which asserts the [data-op] control set is
// identical across data-degrade="3d"/"2d"/"text"). Supplies the per-target
// hooks the universal harness (../live-gate.mjs) needs; the harness itself
// knows nothing about rooms. The real backend is the generated scaffold at
// testing/backend/sources/room/backend.mjs (reused unchanged), served
// same-origin by ./room_bridge.mjs. See specs/definition-of-done.md (D5 + D6).
import { existsSync } from "node:fs";
import { start, TWIN_FILE } from "./room_bridge.mjs";

export const name = "room";
export const twinFile = TWIN_FILE;

// The room backend and twin both ship inside this repo — available whenever
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

// bootTwin(): the room twin (examples/room/twin.html) connects the moment it
// parses (same as notes/patch/mix) — no #tok field, no #connect button. A
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

// room has no folder/scope concept, so the fixture is a trivial marker (same
// pattern as notes/urlshortener/patch/mix) — real writes the gate drives
// land in the same fixed small room the bridge boots (three stations, two
// doors, one factory link). Witness measures DELTAS between calls, so the
// pre-existing factory link never affects G3/G4/G5/G6b.
export async function fixture(_ctx) {
  return { scope: "gate-" + Date.now() };
}

// witness(): out-of-band, monotonic observable of real state — `rev`, part
// of the real state `room.state` returns (see manual.md's "Witness"
// section), read through the harness's own raw() call, a channel the twin's
// own DOM never touches. It advances by exactly 1 on every op that actually
// changes state, and never on a refusal or a same-value/already-open/
// already-closed no-op — so it is a faithful stand-in for "the real
// out-of-band state changed" whether the change came from a station dial, a
// door step, or a link/unlink.
export async function witness(ctx, _fx) {
  const r = await ctx.raw("room", { op: "state", params: {} });
  return r && typeof r.rev === "number" ? r.rev : -1;
}

// Representative nodes the gate drives through the twin, matched by the
// EXACT data-op value (never by visible label/text — skill/SKILL.md's
// Control grammar). `write` drives the DIAL gesture (a station tile:
// station.setLevel); `write2` drives the STEP gesture (a door tile:
// door.open) — so G3 and G4 between them exercise two of the room's own
// gesture names, not the synth's turn/patch and not the DAW's fade/mute/
// route. `refuse` drives DIAL again (an unknown station), proving
// honesty-on-failure for a station tile, not just a knob or a fader.
// `destructive` drives the LINK gesture, removing the factory link
// (link.disconnect), gated by the typed-name confirm (G6b).
export function probes(_fx) {
  return {
    write: { control: "station.setLevel", params: { station: "comms", value: "80" }, expectDelta: 1 },
    write2: { control: "door.open", params: { door: "north" }, expectDelta: 1 },
    // an unknown station: the backend must refuse
    // ({ok:false,error:"unknown station ..."}), and the twin must show that
    // refusal, not a fabricated success — driven through the same DIAL
    // gesture as `write`.
    refuse: { control: "station.setLevel", params: { station: "does-not-exist", value: "0" } },
    // the factory link (helm -> comms) exists from construction
    // (backend.mjs), so this is safe to drive at any point in the run —
    // removing it drops the link count by one but still advances the
    // monotonic rev by exactly 1.
    destructive: { control: "link.disconnect", params: { a: "helm", b: "comms" }, expectDelta: 1 },
  };
}

// --- optional: completeness sweep support (G2 read causation + `--all`) ---
export async function catalogue(_ctx) {
  return [
    { facade: "station", op: "setLevel", name: "station.setLevel", mutates: true, required: ["station", "value"] },
    { facade: "door", op: "open", name: "door.open", mutates: true, required: ["door"] },
    { facade: "door", op: "close", name: "door.close", mutates: true, required: ["door"] },
    { facade: "link", op: "connect", name: "link.connect", mutates: true, required: ["a", "b"] },
    { facade: "link", op: "disconnect", name: "link.disconnect", mutates: true, required: ["a", "b"] },
    { facade: "room", op: "state", name: "room.state", mutates: false, required: [] },
  ];
}

// A read op the gate can drive through the twin for a facade's live sweep:
// only `room.state` is a read with zero required params; `station`, `door`,
// and `link` have no such op (every one of their ops mutates) — readProbe
// honestly returns null for those, named (not skipped) in the --all sweep,
// same convention as patch.mjs's osc/filter facades and daw.mjs's
// transport/track facades.
export function readProbe(catRows, facade, _fx) {
  const op = catRows.find((r) => r.facade === facade && !r.mutates && r.required.length === 0);
  if (!op) return null;
  return { control: op.name, params: {} };
}
