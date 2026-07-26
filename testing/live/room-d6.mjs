// D6 proof — lossless degrade (specs/definition-of-done.md): the room twin's
// [data-op] control set is IDENTICAL
// across data-degrade="3d" (default), "2d", and "text". Degrading is
// presentation-only (spatial-kit.css keyed off the twin root's data-degrade
// attribute) — it never adds or removes a function.
//
// This is a DEDICATED check the room adapter runs (skill/SKILL.md's genre
// system section names the alternative: fold into skill/sheet/gate.mjs's L1,
// OR a dedicated check the room adapter runs). The dedicated route was
// chosen deliberately: skill/sheet/gate.mjs is the twin-sheet/1 contract
// gate — generic over the component sheet, with no adapter and no knowledge
// of any specific genre or twin (see its own header comment: "a fixed
// twin-sheet/1 contract check, not parameterised over a target"). Teaching
// it about examples/room/twin.html specifically would break that
// genre-neutral framing for a check that is really about ONE genre's CSS
// degrade contract, not the sheet's own. Boots the REAL room bridge (the
// same one testing/live/adapters/room.mjs uses for the live gate) so the
// twin's tier-1 controls render from real backend state, exactly as they do
// in a normal live-gate run — no stubbing, no synthetic DOM.
//
// Why a passing run of this file, together with a passing `npm run
// test:live:room`, proves D6 end to end: the live gate
// (testing/live/live-gate.mjs) drives every control it finds purely through
// the Control grammar's DOM attributes (data-op/data-param/data-gesture) —
// it never touches CSS, and jsdom itself has no CSS layout engine at all.
// So a live-gate run against this twin IS already a drive of the "text"
// layer (the same DOM a screen reader or a plain-text client would see).
// This script makes the identity between the 3d/2d/text layers explicit and
// mechanically checked, rather than merely implied by "CSS doesn't run in
// jsdom".
//
//   node testing/live/room-d6.mjs
//
// Exits 0 and prints "ok" on success, exits 1 and prints the differing sets
// on failure.
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { start, TWIN_FILE } from "./adapters/room_bridge.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function opSet(doc) {
  return [...doc.querySelectorAll("[data-op]")].map((el) => el.getAttribute("data-op")).sort();
}
function sameSet(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main() {
  const { baseUrl, teardown } = await start();
  let exitCode = 0;
  try {
    const html = readFileSync(TWIN_FILE, "utf8");
    const dom = new JSDOM(html, {
      runScripts: "dangerously", pretendToBeVisual: true,
      beforeParse(w) {
        w.fetch = (u, o) => fetch(new URL(u, baseUrl), o);
        w.HTMLElement.prototype.scrollIntoView = function () {};
      },
    });
    const { window } = dom; const doc = window.document;
    await sleep(400); // let boot()'s real fetches resolve and the tier-1 room render

    const root = doc.body; // data-degrade lives on <body class="twin" data-degrade="...">, see examples/room/twin.html

    root.setAttribute("data-degrade", "3d");
    const set3d = opSet(doc);
    root.setAttribute("data-degrade", "2d");
    const set2d = opSet(doc);
    root.setAttribute("data-degrade", "text");
    const setText = opSet(doc);

    const nonEmpty = set3d.length > 0;
    const eq3d2d = sameSet(set3d, set2d);
    const eq3dText = sameSet(set3d, setText);
    const pass = nonEmpty && eq3d2d && eq3dText;

    if (pass) {
      console.log(`ok   D6 control-set invariance: ${set3d.length} [data-op] controls, identical across 3d/2d/text`);
      console.log("     " + JSON.stringify(set3d));
    } else {
      console.error("FAIL D6 control-set invariance");
      console.error("     3d   (" + set3d.length + "): " + JSON.stringify(set3d));
      console.error("     2d   (" + set2d.length + "): " + JSON.stringify(set2d));
      console.error("     text (" + setText.length + "): " + JSON.stringify(setText));
      exitCode = 1;
    }
  } finally {
    teardown();
  }
  process.exit(exitCode);
}

main();
