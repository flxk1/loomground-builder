// notes adapter for the live Definition-of-Done gate (L2, SECOND target —
// this is the proof that live-gate.mjs is target-agnostic, not just built
// for RVND). Supplies the per-target hooks the universal harness
// (../live-gate.mjs) needs; the harness itself knows nothing about notes.
// The real backend is the generated scaffold at
// testing/backend/sources/notes/backend.mjs (reused unchanged), served
// same-origin by ./notes_bridge.mjs. See specs/definition-of-done.md.
import { existsSync } from "node:fs";
import { start, TWIN_FILE } from "./notes_bridge.mjs";

export const name = "notes";
export const twinFile = TWIN_FILE;

// The notes backend and twin both ship inside this repo (no external app
// dir to locate, unlike RVND) — available whenever the twin file exists.
export function available() {
  return existsSync(TWIN_FILE);
}

// boot() -> { baseUrl, raw(tool,args), teardown() }. Both the backend and the
// bridge are plain JS, so the bridge starts in-process — no subprocess and
// no cross-language boot script needed (contrast RVND's rvnd_boot.py, which
// exists only because RVND is Python). No auth: the bridge takes no token,
// so ctx.token is the empty string.
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

// bootTwin(): the point of the L2 refactor. RVND's twin waits for #tok to be
// filled and #connect to be clicked; the notes twin (examples/notes/twin.html)
// calls its own boot() at the bottom of its inline script and connects the
// moment it parses — there is no field or button to drive. So this hook is a
// deliberate no-op: the harness no longer needs to know which twin needs
// which, it just awaits whatever the adapter says "boot" means here.
export async function bootTwin(_window, _doc, _ctx) {}

// G0 provenance: fetched from the SERVED bridge (GET /info), not from an
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

// Notes has no folder/scope concept, so the fixture is trivial — a marker,
// not a created resource (contrast RVND's fixture(), which really creates a
// throwaway workspace folder). Real writes the gate drives land in the same
// flat in-memory store as the bridge's two seed notes; witness measures
// DELTAS between calls, so pre-existing notes never affect G3/G4/G5.
export async function fixture(_ctx) {
  return { scope: "gate-" + Date.now() };
}

// witness(): out-of-band, monotonic observable of real state — the note
// count, read through the harness's own raw() call to `list`, a channel the
// twin's own DOM never touches.
export async function witness(ctx, _fx) {
  const r = await ctx.raw("notes", { op: "list", params: {} });
  return r && Array.isArray(r.notes) ? r.notes.length : -1;
}

// Representative nodes the gate drives through the twin. `control` is
// matched against the twin's rendered op label ("notes.<op>"); `params` are
// filled into its op-surface fields by field-label substring match.
export function probes(_fx) {
  return {
    write: { control: "notes.add", params: { text: "gate probe alpha" }, expectDelta: 1 },
    write2: { control: "notes.add", params: { text: "gate probe beta" }, expectDelta: 1 },
    // a nonexistent id: the backend must refuse (`{ok:false,error:"not found"}`),
    // and the twin must show that refusal, not a fabricated success.
    refuse: { control: "notes.get", params: { id: "does-not-exist" } },
  };
}

// --- optional: completeness sweep support (G2 read causation + `--all`) ---
// Not required for notes (the task explicitly allows skipping this), but
// cheap to support honestly since the catalogue is small and static, so it's
// wired up rather than left out. G2 only ever runs inside the `--all` sweep
// (see live-gate.mjs) — the plain `test:live:notes` run never exercises it;
// `test:live:notes:all` does.
export async function catalogue(_ctx) {
  return [
    { facade: "notes", op: "add", name: "notes.add", mutates: true, required: ["text"] },
    { facade: "notes", op: "list", name: "notes.list", mutates: false, required: [] },
    { facade: "notes", op: "get", name: "notes.get", mutates: false, required: ["id"] },
    { facade: "notes", op: "done", name: "notes.done", mutates: true, required: ["id"] },
    { facade: "notes", op: "remove", name: "notes.remove", mutates: true, required: ["id"] },
  ];
}

// A read op the gate can drive through the twin for a facade's live sweep:
// `list` needs no params at all, so it's always available as a probe.
export function readProbe(catRows, facade, _fx) {
  const op = catRows.find((r) => r.facade === facade && !r.mutates && r.required.length === 0);
  if (!op) return null;
  return { control: op.name, params: {} };
}
