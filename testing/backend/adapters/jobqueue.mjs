// jobqueue source adapter for the backend gate. Same shape as
// adapters/notes.mjs, adapters/inventory.mjs, and adapters/urlshortener.mjs —
// the harness (../backend-gate.mjs) is unchanged; only this adapter differs,
// which is the point: it proves the backend gate is source-agnostic. The
// "source" is sources/jobqueue/manual.md; the backend under test is the
// scaffold generated from it. See specs/backend-from-model.md.
//
// Unlike notes/inventory/urlshortener, the manual declares no "list all"
// read, so fingerprint() is built from the two reads it does declare (`size`
// and `peek`) rather than a full dump. That pair is sufficient to observe
// every declared write here: enqueue/dequeue/purge each change the count,
// and sampleArgs() below guarantees a job is present before dequeue/purge are
// probed so the count actually moves.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, "..", "sources", "jobqueue", "backend.mjs");

export const name = "jobqueue";
export const source = "sources/jobqueue/manual.md";

export function available() {
  return existsSync(BACKEND);
}

// boot() -> { call(op,args), info(), teardown() }. A fresh generated backend
// instance, called in-process.
export async function boot() {
  const mod = await import(BACKEND);
  const be = mod.create();
  return { call: (op, args) => be.call(op, args), info: () => be.info(), teardown() {} };
}

// B0 provenance: the shipped provenance stamp (the visible artifact). The
// harness validates the runtime stamp universally and checks it matches this.
export const stampFile = join(HERE, "..", "sources", "jobqueue", "provenance.json");

// The declared model (from the manual): every op the backend must expose,
// with mutation class and params. The gate asserts the backend really
// implements it.
export function surface() {
  return [
    { op: "enqueue", mutates: true, params: ["payload"] },
    { op: "dequeue", mutates: true, params: [] },
    { op: "peek", mutates: false, params: [] },
    { op: "size", mutates: false, params: [] },
    { op: "purge", mutates: true, destructive: true, params: [] },
  ];
}

// A minimal, valid call for a declared op, so surface + mutation-class
// conformance can probe it without false negatives. dequeue and purge are
// declared writes that must actually change something to be observed as
// mutating, so their setup mints a job first (a write done before the
// harness measures "before" — see backend-gate.mjs's B1b loop).
export function sampleArgs(ctx, op) {
  if (op === "enqueue") return { payload: "probe" };
  if (op === "dequeue") { ctx.call("enqueue", { payload: "probe-dequeue" }); return {}; }
  if (op === "purge") { ctx.call("enqueue", { payload: "probe-purge" }); return {}; }
  return {}; // peek, size — no params, no setup needed
}

// The manual's stated behaviours as data (B2): given/when/then vectors the
// harness interprets, grouped by domain for chunking. See vectors.json.
export const vectorsFile = join(HERE, "..", "sources", "jobqueue", "vectors.json");

// Self-consistency (B3): the backend's own out-of-band witness — a write op
// is observable by a read op. witness() reads state; write() advances it.
export function witness(ctx) { return ctx.call("size").count; }
export function write(ctx) { return ctx.call("enqueue", { payload: "witness" }); }

// Fingerprint for mutation-class conformance (B1b): no "list all" read is
// declared, so this composes the two declared reads — the count and the head
// — into a snapshot. Every declared write (enqueue/dequeue/purge) moves the
// count; peek and size never touch queue state, so calling either to take
// this snapshot cannot itself change it.
export function fingerprint(ctx) {
  return JSON.stringify({ count: ctx.call("size").count, head: ctx.call("peek") });
}
