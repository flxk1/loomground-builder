#!/usr/bin/env node
// Conformance kit — one entry over the three gates (structural, live,
// backend), driven by a PROFILE: a JSON file naming a mode and, for the two
// adapter-driven modes, an adapter. The kit itself is artifact-agnostic: which
// target actually gets checked is decided entirely by the profile's `adapter`
// path, never hardcoded here — point a profile at your own adapter (built to
// the contract in specs/definition-of-done.md or specs/backend-from-model.md)
// and this runs the same three gates against it.
//
//   node bin/conformance.mjs <profile.json>            human report, exit reflects verdict
//   node bin/conformance.mjs <profile.json> --json      machine report (the structured object)
//
// Profile shape:
//   { "mode": "structural" | "live" | "backend",
//     "adapter": "<path, resolved relative to the profile file>",   // live/backend only
//     "all": false }                                                 // live/backend: run the completeness sweep
//
// Exit 0 iff verdict is "pass" or "skip" (a clean "no target present" skip —
// each gate's own CLI already exits 0 on that; the kit matches). Exit 1 on
// "fail". Malformed invocation (bad path, bad mode) exits 2.
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function usage(msg) {
  if (msg) console.error("conformance: " + msg);
  console.error("usage: node bin/conformance.mjs <profile.json> [--json]");
  process.exit(2);
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const profileArg = args.find((a) => !a.startsWith("--"));
if (!profileArg) usage("missing <profile.json>");

const absProfilePath = resolve(process.cwd(), profileArg);
let profile;
try {
  profile = JSON.parse(readFileSync(absProfilePath, "utf8"));
} catch (e) {
  usage(`cannot read profile '${profileArg}': ${e.message || e}`);
}

const GATES = {
  structural: () => import(new URL("../skill/sheet/gate.mjs", import.meta.url)),
  live: () => import(new URL("../testing/live/live-gate.mjs", import.meta.url)),
  backend: () => import(new URL("../testing/backend/backend-gate.mjs", import.meta.url)),
};

if (!GATES[profile.mode]) {
  usage(`profile.mode must be one of ${Object.keys(GATES).join(", ")} (got ${JSON.stringify(profile.mode)})`);
}

// The adapter is resolved relative to the profile. It must remain under either
// the profile directory (for third-party conformance packs) or this builder
// root (for the shipped profiles); the gate resolves real paths before import.
let adapterPath;
if (profile.adapter) {
  adapterPath = isAbsolute(profile.adapter) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(profile.adapter)
    ? profile.adapter
    : resolve(dirname(absProfilePath), profile.adapter);
  if (isAbsolute(adapterPath)) adapterPath = pathToFileURL(adapterPath).href;
}
const builderRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const adapterRoots = [dirname(absProfilePath), builderRoot];

const gateMod = await GATES[profile.mode]();
const result = await gateMod.runGate({
  adapterPath,
  adapterRoots,
  all: !!profile.all,
  print: !asJson,
});

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\nconformance: profile=${profileArg} mode=${result.mode} adapter=${result.adapter ?? "(none)"} verdict=${result.verdict.toUpperCase()}`);
  if (result.completeness) {
    const c = result.completeness;
    console.log(`completeness: ${c.covered}/${c.total} covered` + (c.missing.length ? ` — missing: ${c.missing.join(", ")}` : ""));
  } else {
    console.log("completeness: n/a (no surface for this mode)");
  }
  const failedProps = result.properties.filter((p) => !p.pass);
  if (failedProps.length) {
    console.log("failed properties: " + failedProps.map((p) => p.id).join(", "));
  }
}

process.exit(result.verdict === "fail" ? 1 : 0);
