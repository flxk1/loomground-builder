// inventory source adapter for the backend gate. Same shape as adapters/notes.mjs
// — the harness (../backend-gate.mjs) is unchanged; only this adapter differs,
// which is the point: it proves the backend gate is source-agnostic.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, "..", "sources", "inventory", "backend.mjs");

export const name = "inventory";
export const source = "sources/inventory/manual.md";

export function available() {
  return existsSync(BACKEND);
}

export async function boot() {
  const mod = await import(BACKEND);
  const be = mod.create();
  return { call: (op, args) => be.call(op, args), info: () => be.info(), teardown() {} };
}

// The shipped provenance stamp (the visible artifact); validated by the harness.
export const stampFile = join(HERE, "..", "sources", "inventory", "provenance.json");

export function surface() {
  return [
    { op: "stock", mutates: true, params: ["item", "qty"] },
    { op: "take", mutates: true, params: ["item", "qty"] },
    { op: "level", mutates: false, params: ["item"] },
    { op: "items", mutates: false, params: [] },
    { op: "discard", mutates: true, destructive: true, params: ["item"] },
  ];
}

// Each declared op gets a minimal, state-changing (for writes) valid call, so
// surface + mutation-class conformance probe it without false negatives. Writes
// that need existing stock create their own fixture first.
export function sampleArgs(ctx, op) {
  if (op === "stock") return { item: "probe-stock", qty: 1 };
  if (op === "take") { ctx.call("stock", { item: "probe-take", qty: 5 }); return { item: "probe-take", qty: 1 }; }
  if (op === "level") return { item: "probe-level" };
  if (op === "discard") { ctx.call("stock", { item: "probe-discard", qty: 1 }); return { item: "probe-discard" }; }
  return {};
}

// The manual's stated behaviours as data (B2), including the refusal one; the
// harness interprets vectors.json and chunks by domain.
export const vectorsFile = join(HERE, "..", "sources", "inventory", "vectors.json");

// Self-consistency witness: total units in stock — a write advances it.
export function witness(ctx) { return ctx.call("items").items.reduce((s, r) => s + r.level, 0); }
export function write(ctx) { return ctx.call("stock", { item: "witness", qty: 1 }); }
export function fingerprint(ctx) { return JSON.stringify(ctx.call("items").items); }
