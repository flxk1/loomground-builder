// notes source adapter for the backend gate. Supplies the per-source hooks the
// universal harness (../backend-gate.mjs) needs; the harness knows nothing
// about notes. The "source" is sources/notes/manual.md; the backend under test
// is the scaffold generated from it. See specs/backend-from-model.md.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, "..", "sources", "notes", "backend.mjs");

export const name = "notes";
export const source = "sources/notes/manual.md";

export function available() {
  return existsSync(BACKEND);
}

// boot() -> { call(op,args), info(), teardown() }. A fresh generated backend
// instance, called in-process (the adapter owns the call mechanism, so a future
// source could call over HTTP instead without changing the harness).
export async function boot() {
  const mod = await import(BACKEND);
  const be = mod.create();
  return { call: (op, args) => be.call(op, args), info: () => be.info(), teardown() {} };
}

// B0 provenance: the backend under test is the generated one, and it says so.
// The shipped provenance stamp (the visible artifact). The harness validates
// the runtime stamp universally and checks it matches this file.
export const stampFile = join(HERE, "..", "sources", "notes", "provenance.json");

// The declared model (from the manual): every op the backend must expose, with
// mutation class and params. The gate asserts the backend really implements it.
export function surface() {
  return [
    { op: "add", mutates: true, params: ["text"] },
    { op: "list", mutates: false, params: [] },
    { op: "get", mutates: false, params: ["id"] },
    { op: "done", mutates: true, params: ["id"] },
    { op: "remove", mutates: true, destructive: true, params: ["id"] },
  ];
}

// A minimal, valid call for a declared op, so surface conformance can probe it
// without unknown-op false negatives. Ops needing an id get a freshly made one.
export function sampleArgs(ctx, op) {
  if (op === "add") return { text: "probe" };
  if (["get", "done", "remove"].includes(op)) { const r = ctx.call("add", { text: "probe" }); return { id: r.id }; }
  return {};
}

// The manual's stated behaviours as data (B2): given/when/then vectors the
// harness interprets, grouped by domain for chunking. See vectors.json.
export const vectorsFile = join(HERE, "..", "sources", "notes", "vectors.json");

// Self-consistency (B3): the backend's own out-of-band witness — a write op is
// observable by a read op. witness() reads state; write() advances it.
export function witness(ctx) { return ctx.call("list").notes.length; }
export function write(ctx) { return ctx.call("add", { text: "witness" }); }

// Full-state fingerprint for mutation-class conformance: any write changes it,
// any read leaves it unchanged.
export function fingerprint(ctx) { return JSON.stringify(ctx.call("list").notes); }
