// urlshortener adapter for the live Definition-of-Done gate (L2). The target of
// the twin cold test: the twin at examples/urlshortener/twin.html is produced
// COLD by a fresh session from the skill alone; THIS adapter (the gate) is
// authored independently so the twin cannot be tuned to a gate it wrote.
// Real backend: the generated scaffold at
// testing/backend/sources/urlshortener/backend.mjs (reused unchanged), served
// same-origin by ./urlshortener_bridge.mjs. See specs/definition-of-done.md.
import { existsSync } from "node:fs";
import { start, TWIN_FILE } from "./urlshortener_bridge.mjs";

export const name = "urlshortener";
export const twinFile = TWIN_FILE;

export function available() {
  return existsSync(TWIN_FILE);
}

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

// bootTwin(): authored WITHOUT seeing the cold twin, so it is robust to either
// boot style the skill might produce — a twin that auto-connects on load (like
// the notes worked example, no control to drive) OR one with a #connect button
// (and optional #tok). Drive the button if present; otherwise no-op.
export async function bootTwin(window, doc, _ctx) {
  const tok = doc.getElementById("tok");
  if (tok) tok.value = "";
  const connect = doc.getElementById("connect");
  if (connect) connect.dispatchEvent(new window.MouseEvent("click"));
}

// G0 provenance: fetched from the SERVED bridge (GET /info), not an in-process
// import — a stray mock on the same port could not silently satisfy it.
export async function provenance(ctx) {
  const r = await fetch(ctx.baseUrl + "/info");
  const stamp = await r.json().catch(() => null);
  const ok = !!stamp && stamp.generated === true && stamp.class === "scaffold";
  return {
    ok,
    detail: stamp ? `${stamp.name} · generated:${stamp.generated} · source:${stamp.source}` : "no provenance stamp served at /info",
  };
}

// urlshortener has no folder/scope concept, so the fixture is a trivial marker.
export async function fixture(_ctx) {
  return { scope: "gate-" + Date.now() };
}

// witness(): out-of-band, monotonic observable of real state — the live entry
// count, read through the harness's own raw() call to `list`, a channel the
// twin's own DOM never touches.
export async function witness(ctx, _fx) {
  const r = await ctx.raw("urlshortener", { op: "list", params: {} });
  return r && Array.isArray(r.entries) ? r.entries.length : -1;
}

// Representative nodes the gate drives through the twin. `control` matches the
// twin's rendered op label ("urlshortener.<op>"); a `shorten` write mints a new
// entry (witness +1); the refuse probe resolves a code that was never minted —
// a STATE-INDEPENDENT refusal ({ok:false}), which the twin must show as a
// refusal, not fabricate a success.
export function probes(_fx) {
  return {
    write: { control: "urlshortener.shorten", params: { url: "https://gate.example/alpha" }, expectDelta: 1 },
    write2: { control: "urlshortener.shorten", params: { url: "https://gate.example/beta" }, expectDelta: 1 },
    refuse: { control: "urlshortener.resolve", params: { code: "never-minted" } },
    // Optional destructive probe (see live-gate.mjs G6b): urlshortener.remove
    // is destructive-marked in the twin, so its confirm dialog is typed-name
    // gated on the full "urlshortener.remove" (skill/sheet/twin-sheet.js
    // confirmGate checks the typed value against fn.name). Targets the
    // bridge's own seed data (urlshortener_bridge.mjs seeds two entries at
    // boot, "https://example.com/one" then "https://example.com/two",
    // minted deterministically as codes "s1" then "s2" by the fresh backend
    // instance) — code "s1" always exists before any gate-driven write, so
    // this is safe to drive at any point in the run, removing one of the two
    // seed entries and dropping the witness by exactly 1.
    destructive: { control: "urlshortener.remove", params: { code: "s1" }, expectDelta: -1 },
  };
}

export async function catalogue(_ctx) {
  return [
    { facade: "urlshortener", op: "shorten", name: "urlshortener.shorten", mutates: true, required: ["url"] },
    { facade: "urlshortener", op: "resolve", name: "urlshortener.resolve", mutates: false, required: ["code"] },
    { facade: "urlshortener", op: "list", name: "urlshortener.list", mutates: false, required: [] },
    { facade: "urlshortener", op: "remove", name: "urlshortener.remove", mutates: true, required: ["code"] },
  ];
}

// A read the gate can drive for the live sweep: `list` needs no params.
export function readProbe(catRows, facade, _fx) {
  const op = catRows.find((r) => r.facade === facade && !r.mutates && r.required.length === 0);
  if (!op) return null;
  return { control: op.name, params: {} };
}
