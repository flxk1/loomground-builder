// urlshortener source adapter for the backend gate. Same shape as
// adapters/notes.mjs and adapters/inventory.mjs — the harness
// (../backend-gate.mjs) is unchanged; only this adapter differs, which is the
// point: it is the third proof that the backend gate is source-agnostic.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, "..", "sources", "urlshortener", "backend.mjs");

export const name = "urlshortener";
export const source = "sources/urlshortener/manual.md";

export function available() {
  return existsSync(BACKEND);
}

export async function boot() {
  const mod = await import(BACKEND);
  const be = mod.create();
  return { call: (op, args) => be.call(op, args), info: () => be.info(), teardown() {} };
}

// The shipped provenance stamp (the visible artifact); validated by the harness.
export const stampFile = join(HERE, "..", "sources", "urlshortener", "provenance.json");

export function surface() {
  return [
    { op: "shorten", mutates: true, params: ["url"] },
    { op: "resolve", mutates: false, params: ["code"] },
    { op: "list", mutates: false, params: [] },
    { op: "remove", mutates: true, destructive: true, params: ["code"] },
  ];
}

// Each declared op gets a minimal, valid call, so surface + mutation-class
// conformance probe it without unknown-op false negatives. Ops needing a code
// mint one first via shorten (the only way a valid code exists).
export function sampleArgs(ctx, op) {
  if (op === "shorten") return { url: "https://example.com/probe" };
  if (["resolve", "remove"].includes(op)) { const r = ctx.call("shorten", { url: "https://example.com/probe" }); return { code: r.code }; }
  return {};
}

// The manual's stated behaviours as data (B2), including both refusal
// vectors; the harness interprets vectors.json and chunks by domain.
export const vectorsFile = join(HERE, "..", "sources", "urlshortener", "vectors.json");

// Self-consistency witness: number of live entries — a write advances it.
export function witness(ctx) { return ctx.call("list").entries.length; }
export function write(ctx) { return ctx.call("shorten", { url: "https://example.com/witness" }); }
export function fingerprint(ctx) { return JSON.stringify(ctx.call("list").entries); }
