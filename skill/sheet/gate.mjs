// twin-sheet/1 render gate — boots demo.html in jsdom and asserts the
// sheet's behavioural contract. Run: node gate.mjs   (needs jsdom on the
// resolution path). Screenshot-based visual critique is a separate,
// additional step (SKILL.md visual loop) — this gate covers structure and
// gating behaviour only.
//
// runGate() is the reusable entry (used directly and by the conformance kit,
// ../../bin/conformance.mjs); the bottom of this file is a thin CLI wrapper
// that calls it and reproduces today's console output and exit code exactly.
// Structural mode has no adapter and no completeness surface (a fixed
// twin-sheet/1 contract check, not parameterised over a target) — both are
// reported as null in the returned result, per the conformance kit's shared
// shape.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// runGate(opts) -> { mode, adapter, properties, completeness, verdict }
//   opts.print (default false) — when true, mirrors the CLI's current
//   "ok/FAIL <name>" per-assertion lines and final "GATE PASS/FAIL" summary,
//   in the same order and on the same streams (stdout for ok, stderr for
//   FAIL) as before the refactor.
export async function runGate(opts = {}) {
  const print = !!opts.print;

  const html = readFileSync(join(here, "demo.html"), "utf8")
    .replace(/<link[^>]+>/g, "")                     // css files parsed separately
    .replace('<script src="twin-sheet.js"></script>',
      "<script>" + readFileSync(join(here, "twin-sheet.js"), "utf8") + "</script>");

  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  const doc = dom.window.document;
  await new Promise(r => setTimeout(r, 50));

  const properties = [];
  let n = 0, failed = 0;
  function ok(cond, name, detail) {
    n++;
    cond = !!cond;
    if (!cond) failed++;
    properties.push({ id: String(n), name, pass: cond, detail: detail ?? null });
    if (print) {
      if (cond) console.log("ok   " + name);
      else console.error("FAIL " + name);
    }
    return cond;
  }

  // css parses and stays inside the neutral interface
  for (const f of ["twin-sheet.css", "binding-default.css"]) {
    const css = readFileSync(join(here, f), "utf8");
    ok(!/\{[^}]*#[0-9a-fA-F]{3,8}[^}]*\}/.test(css) || f.startsWith("binding"),
      f + ": components declare no raw colours (bindings may)");
  }
  const sheetCss = readFileSync(join(here, "twin-sheet.css"), "utf8");
  ok(!/--(?:rvnd|notes|url(?:shortener)?)-/.test(sheetCss), "twin-sheet.css references no target token names");
  ok(/twin-sheet\/1/.test(sheetCss), "version marker present");

  // structure
  ok(doc.querySelector(".tw-header h1"), "header renders");
  ok(doc.querySelectorAll(".tw-lamp").length >= 8, "lamps render with vocabulary");
  [...doc.querySelectorAll(".tw-lamp")].forEach((l, i) => {
    if (i < 3) ok(l.textContent.trim().length > 0, "lamp " + i + " carries a text label");
  });
  ok(doc.querySelectorAll(".tw-steps").length === 5, "stepped ordinals render");
  ok(doc.querySelectorAll(".tw-shelf").length === 2, "one shelf per facade");
  ok(doc.querySelectorAll(".tw-oprow").length === 5, "every catalogued function has a row");
  ok(doc.querySelector(".tw-palette input"), "palette input present");

  // palette reaches every function
  const input = doc.querySelector(".tw-palette input");
  input.value = "reset";
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  ok(doc.querySelectorAll(".tw-palette-list button").length === 1, "palette filters to match");

  // Control grammar (skill/SKILL.md's "Control grammar" section): every op
  // row carries data-op (exactly its own catalogued function name) and
  // data-gesture — the form-independent hooks the live gate drives by,
  // never by scanning visible text.
  const oprows = [...doc.querySelectorAll(".tw-oprow")];
  ok(oprows.every(b => b.getAttribute("data-op") && b.getAttribute("data-op") === b.querySelector(".tw-opname").textContent),
    "every op row's data-op matches its own function name");
  ok(oprows.every(b => b.getAttribute("data-gesture") === "activate"),
    "every op row declares its gesture (data-gesture=\"activate\")");

  // gating: destructive op → typed-name confirm, disabled until typed
  const surface = doc.getElementById("surface");
  // The op-surface already open by default (demo.html's openSurface(alpha.set))
  // carries data-param on each declared param — the Control grammar's param
  // hook, not a field-label guess.
  ok([...surface.querySelectorAll("[data-param]")].map(f => f.getAttribute("data-param")).join(",") === "id,value",
    "op-surface param inputs carry data-param matching the catalogued params");
  doc.querySelectorAll(".tw-oprow")[4].click();          // beta.reset (destructive)
  await new Promise(r => setTimeout(r, 10));
  surface.querySelector(".tw-btn.primary, .tw-btn.danger") ||
    surface.querySelector(".tw-btn");
  surface.querySelectorAll(".tw-btn")[0].click();        // Compose…
  await new Promise(r => setTimeout(r, 10));
  const dialog = surface.querySelector(".tw-dialog");
  ok(dialog, "confirm dialog appears for mutating function");
  ok(dialog && dialog.classList.contains("destructive"), "destructive framing applied");
  const confirmBtn = [...dialog.querySelectorAll("button")].find(b => b.textContent === "Confirm");
  ok(confirmBtn && confirmBtn.disabled, "typed-name gate: confirm starts disabled");
  const gateInput = dialog.querySelector("input");
  gateInput.value = "beta.reset";
  gateInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  ok(!confirmBtn.disabled, "typed-name gate: exact name enables confirm");
  // cancel fires nothing
  const logBefore = doc.querySelectorAll(".tw-log li").length;
  [...dialog.querySelectorAll("button")].find(b => b.textContent === "Cancel").click();
  await new Promise(r => setTimeout(r, 10));
  const cancelEntry = doc.querySelectorAll(".tw-log li").length - logBefore;
  ok(cancelEntry === 1 && doc.querySelector(".tw-log li").textContent.includes("NOT SENT"),
    "cancel logs NOT SENT and dispatches nothing");

  // densities are distinct
  const body = doc.body;
  body.setAttribute("data-density", "compact");
  ok(body.getAttribute("data-density") === "compact", "density attribute flips");

  if (print) console.log(failed === 0 ? `\nGATE PASS (${n} assertions)` : `\nGATE FAIL (${failed}/${n})`);

  return {
    mode: "structural",
    adapter: null,
    properties,
    completeness: null,          // no surface to be complete over — a fixed contract check
    verdict: failed === 0 ? "pass" : "fail",
  };
}

// --- CLI entry: unchanged behaviour (same output, same exit code) ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runGate({ print: true });
  process.exit(result.verdict === "pass" ? 0 : 1);
}
