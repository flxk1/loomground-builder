#!/usr/bin/env node
/**
 * Aggregate negative release gate.
 *
 * Each case mutates a fresh, isolated copy of the release candidate, invokes
 * the corresponding real authority, and requires a non-zero verdict. The
 * source checkout is never mutated; fixture restoration is verified after
 * every case by hashing the isolated file before and after.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON = [process.env.PYTHON || "python3"];
const sha = (text) => createHash("sha256").update(text).digest("hex");

function fail(message) {
  console.error(`TEETH GATE FAIL: ${message}`);
  process.exit(1);
}

function copyCandidate(destination) {
  cpSync(ROOT, destination, {
    recursive: true,
    filter(source) {
      const rel = source.slice(ROOT.length).replace(/^[/\\]/, "");
      return !(
        rel === ".git" || rel.startsWith(".git/")
        || rel === "node_modules" || rel.startsWith("node_modules/")
        || rel === ".venv-meta" || rel.startsWith(".venv-meta/")
        || rel === "release/evidence" || rel.startsWith("release/evidence/")
        || /(^|[/\\])\.DS_Store$/.test(rel)
      );
    },
  });
  symlinkSync(join(ROOT, "node_modules"), join(destination, "node_modules"), "dir");
}

function mutateOnce(root, rel, from, to) {
  const path = join(root, rel);
  const original = readFileSync(path, "utf8");
  const occurrences = original.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${rel}: mutation anchor occurs ${occurrences} times (expected 1)`);
  }
  writeFileSync(path, original.replace(from, to));
  return () => {
    writeFileSync(path, original);
    if (sha(readFileSync(path, "utf8")) !== sha(original)) {
      throw new Error(`${rel}: fixture restoration hash mismatch`);
    }
  };
}

const cases = [
  {
    name: "invalid sixth dimension",
    file: "meta/surface.py",
    from: '"feeds": "causal",',
    to: '"feeds": "invented-sixth",',
    command: [...PYTHON, "-m", "meta.gate"],
  },
  {
    name: "dropped semantic edge",
    file: "meta/store.py",
    from: "graph.save_edges(self.edges_path, subgraph.edges)",
    to: "graph.save_edges(self.edges_path, subgraph.edges[:-1])",
    command: [...PYTHON, "-m", "meta.gate_m4"],
  },
  {
    name: "dropped nD assignment",
    file: "meta/store.py",
    from: 'subgraph.provenance.get("nd_assignments", []))',
    to: 'subgraph.provenance.get("nd_assignments", [])[:-1])',
    command: [...PYTHON, "-m", "meta.gate_m4"],
  },
  {
    name: "wrong-version Solver evidence",
    file: "meta/reasoning.py",
    from: "if context != wanted:",
    to: "if False and context != wanted:",
    command: [...PYTHON, "-m", "meta.gate_m5"],
  },
  {
    name: "missing catalogue control",
    file: "testing/live/adapters/notes.mjs",
    from: '{ facade: "notes", op: "remove", name: "notes.remove", mutates: true, required: ["id"] },',
    to: '{ facade: "notes", op: "remove", name: "notes.remove", mutates: true, required: ["id"] },\n'
      + '    { facade: "notes", op: "ghost", name: "notes.ghost", mutates: false, required: [] },',
    command: ["node", "testing/live/live-gate.mjs", "--all"],
    env: { TWIN_ADAPTER: "./adapters/notes.mjs" },
  },
  {
    name: "scrambled visible-label/control binding",
    file: "skill/sheet/twin-sheet.js",
    from: '"data-op": fn.name,',
    to: '"data-op": fn.note,',
    command: ["node", "skill/sheet/gate.mjs"],
  },
  {
    name: "no-op backend write",
    file: "testing/backend/adapters/notes.mjs",
    from: 'export function write(ctx) { return ctx.call("add", { text: "witness" }); }',
    to: 'export function write(ctx) { return ctx.call("list"); }',
    command: ["node", "testing/backend/backend-gate.mjs"],
  },
  {
    name: "quarantine bypass",
    file: "meta/gate_m7.py",
    from: "if subgraph.quarantined:",
    to: "if False and subgraph.quarantined:",
    command: [...PYTHON, "-m", "meta.gate_m7"],
  },
  {
    name: "mismatched package version",
    file: ".claude-plugin/plugin.json",
    from: '"version": "0.3.2"',
    to: '"version": "999.0.0"',
    command: ["node", "testing/release/package-gate.mjs"],
  },
];

const room = mkdtempSync(join(tmpdir(), "loomground-builder-teeth-"));
let passed = 0;
try {
  for (const test of cases) {
    const candidate = join(room, `case-${passed + 1}`);
    copyCandidate(candidate);
    let restore;
    try {
      restore = mutateOnce(candidate, test.file, test.from, test.to);
      const result = spawnSync(test.command[0], test.command.slice(1), {
        cwd: candidate,
        env: { ...process.env, ...test.env },
        encoding: "utf8",
        timeout: 120_000,
      });
      if (result.error) throw result.error;
      if (result.status === 0) {
        throw new Error(`real gate falsely passed\n${(result.stdout || "").slice(-1200)}`);
      }
      passed++;
      console.log(`ok   ${test.name}: rejected by ${test.command.join(" ")}`);
    } finally {
      restore?.();
      rmSync(candidate, { recursive: true, force: true });
    }
  }
} catch (error) {
  fail(error.message);
} finally {
  rmSync(room, { recursive: true, force: true });
}

if (passed !== cases.length) fail(`only ${passed}/${cases.length} mutations were rejected`);
console.log(`TEETH GATE PASS — ${passed}/${cases.length} deliberate authority mutations rejected`);
