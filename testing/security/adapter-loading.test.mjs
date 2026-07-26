import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { runGate as runBackendGate } from "../backend/backend-gate.mjs";
import { runGate as runLiveGate } from "../live/live-gate.mjs";

const repoRoot = new URL("../../", import.meta.url);

function expectUnauthorized(promise) {
  return assert.rejects(promise, (error) => {
    assert.equal(error.code, "ERR_ADAPTER_NOT_AUTHORIZED");
    return true;
  });
}

test("live gate rejects executable data: adapters before evaluation", async () => {
  globalThis.__builderAdapterRce = false;
  const payload = "data:text/javascript,globalThis.__builderAdapterRce=true;export const available=()=>false";
  await expectUnauthorized(runLiveGate({ adapterPath: payload }));
  assert.equal(globalThis.__builderAdapterRce, false);
});

test("backend gate rejects data/http/https adapter schemes", async () => {
  for (const adapterPath of [
    "data:text/javascript,export const available=()=>false",
    "http://127.0.0.1/adapter.mjs",
    "https://example.invalid/adapter.mjs",
  ]) {
    await expectUnauthorized(runBackendGate({ adapterPath }));
  }
});

test("gate rejects traversal and symlink escapes from its authorized root", async () => {
  const sandbox = mkdtempSync(join(tmpdir(), "builder-adapter-auth-"));
  const allowed = join(sandbox, "allowed");
  const outside = join(sandbox, "outside.mjs");
  mkdirSync(allowed);
  writeFileSync(outside, "export const available=()=>false;\n");
  symlinkSync(outside, join(allowed, "escape.mjs"));

  await expectUnauthorized(runLiveGate({
    adapterPath: "../outside.mjs",
    adapterRoots: [allowed],
  }));
  await expectUnauthorized(runBackendGate({
    adapterPath: pathToFileURL(join(allowed, "escape.mjs")).href,
    adapterRoots: [allowed],
  }));
});

test("conformance rejects a data: adapter without executing it", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "builder-conformance-auth-"));
  const marker = join(sandbox, "executed");
  const payload = `data:text/javascript,import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(marker)},'bad');export const available=()=>false`;
  const profile = join(sandbox, "profile.json");
  writeFileSync(profile, JSON.stringify({ mode: "live", adapter: payload }));

  const result = spawnSync(process.execPath, ["bin/conformance.mjs", profile], {
    cwd: new URL(repoRoot),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ERR_ADAPTER_NOT_AUTHORIZED|not allowed/);
  assert.throws(() => statSync(marker));
});

test("conformance rejects profile traversal outside its authorized roots", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "builder-conformance-traversal-"));
  const profiles = join(sandbox, "profiles");
  mkdirSync(profiles);
  writeFileSync(join(sandbox, "outside.mjs"), "export const available=()=>false;\n");
  const profile = join(profiles, "profile.json");
  writeFileSync(profile, JSON.stringify({ mode: "backend", adapter: "../outside.mjs" }));

  const result = spawnSync(process.execPath, ["bin/conformance.mjs", profile], {
    cwd: new URL(repoRoot),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /outside the authorized local roots/);
});
