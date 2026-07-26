#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REQUIRED = [
  ".claude-plugin/plugin.json",
  "skill/SKILL.md",
  "skill/sheet/gate.mjs",
  "skill/sheet/twin-sheet.js",
  "bin/conformance.mjs",
  "release/gates.json",
  "release/gate.py",
];

function fail(message) {
  console.error(`PACKAGE GATE FAIL: ${message}`);
  process.exit(1);
}

function json(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateManifest(root = ROOT) {
  const pkg = json(join(root, "package.json"), "package.json");
  const plugin = json(join(root, ".claude-plugin/plugin.json"), "plugin manifest");
  if (pkg.name !== "loomground-builder") fail(`package name is ${JSON.stringify(pkg.name)}`);
  if (plugin.name !== pkg.name) fail("plugin and package names differ");
  if (plugin.version !== pkg.version) fail("plugin and package versions differ");
  if (plugin.description !== pkg.description) fail("plugin and package descriptions differ");
  if (pkg.license !== "Apache-2.0") fail("package license must be Apache-2.0");
  if (!plugin.author || plugin.author.name !== "Loomground Contributors") {
    fail("plugin author must be Loomground Contributors");
  }
  if (!Array.isArray(plugin.keywords) || !plugin.keywords.includes("loomground")) {
    fail("plugin keywords must identify Loomground");
  }
  for (const rel of REQUIRED) {
    if (!existsSync(join(root, rel))) fail(`required package file missing: ${rel}`);
  }
  return pkg;
}

const workspacePackage = validateManifest();
const room = mkdtempSync(join(tmpdir(), "loomground-builder-package-"));
try {
  const npmEnv = { ...process.env, npm_config_cache: join(room, "npm-cache") };
  const packed = execFileSync("npm", ["pack", "--json", "--pack-destination", room], {
    cwd: ROOT, env: npmEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
  const packReport = JSON.parse(packed);
  if (!Array.isArray(packReport) || packReport.length !== 1) fail("npm pack returned no single artifact");
  const tarball = join(room, packReport[0].filename);

  const consumer = join(room, "consumer");
  mkdirSync(consumer);
  execFileSync("npm", ["init", "-y"], { cwd: consumer, stdio: "ignore" });
  // Use npm's actual installer without network access. Dependency installation
  // is deliberately omitted here: R11 proves artifact consumption and shipped
  // entry-point integrity; the source gates separately exercise jsdom.
  execFileSync("npm", ["install", "--ignore-scripts", "--offline", "--omit=dev",
    "--cache", join(room, "npm-cache"), tarball], {
    cwd: consumer, env: npmEnv, stdio: ["ignore", "pipe", "pipe"],
  });
  const installed = join(consumer, "node_modules", workspacePackage.name);
  const installedPackage = validateManifest(installed);
  if (installedPackage.version !== workspacePackage.version) fail("installed version changed");

  execFileSync("node", ["--check", join(installed, "skill/sheet/twin-sheet.js")], {
    cwd: consumer, stdio: ["ignore", "pipe", "pipe"],
  });
  execFileSync("node", ["--check", join(installed, "bin/conformance.mjs")], {
    cwd: consumer, stdio: ["ignore", "pipe", "pipe"],
  });
  console.log(`PACKAGE GATE PASS — ${basename(tarball)} installed and smoke-tested in a clean consumer`);
} catch (error) {
  fail(error.stderr?.toString().trim() || error.message);
} finally {
  rmSync(room, { recursive: true, force: true });
}
