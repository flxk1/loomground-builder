// Minimal same-origin HTTP bridge for the mix backend scaffold (live DoD,
// L2 — the THIRD genre, proving D5 for a second time: a transport bar, fader/
// pan/mute track strips, and a bus-routing assignment, not rack buttons and
// not knobs/cables). Reuses testing/backend/sources/mix/backend.mjs
// UNCHANGED; this file does not reimplement the mixer, it only serves it
// over HTTP:
//
//   GET  /       the DAW twin (examples/daw/twin.html)
//   GET  /info   the backend's own provenance stamp (info()) — served, so G0
//                can assert the SERVED backend is the generated one, not
//                trust an in-process import that a mock could impersonate
//   POST /tool   {tool:"mix", args:{op, params}} -> backend.call(op, params)
//
// One tool name ("mix") for all three facades (transport/track/mix) — the
// backend's op surface is a small fixed set (play, stop, setGain, setPan,
// mute, route, unroute, state) with no name collisions, so a single wire
// endpoint is enough; the twin's catalogue still groups them into three
// facades for display (transport.play, track.setGain, mix.route, ...), same
// "facade.op" naming convention as every other twin (skill/SKILL.md).
//
// No auth: like notes_bridge.mjs/patch_bridge.mjs, this bridge takes no
// token — there is nothing to gate the connection on.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "../../backend/sources/mix/backend.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TWIN_FILE = join(HERE, "..", "..", "..", "examples", "daw", "twin.html");

// start() -> { baseUrl, backend, server, teardown() }. Binds on an ephemeral
// loopback port; a fresh backend instance per call (create()), so repeated
// runs never see stale state. No SEED constant here (unlike notes/
// urlshortener): the backend's own construction already carries the
// instrument's fixed mixer + factory route (see backend.mjs/manual.md) —
// there is no create-track/create-bus op to seed through.
export async function start() {
  const backend = create();
  const twinHtml = readFileSync(TWIN_FILE, "utf8");

  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(twinHtml);
      return;
    }
    if (req.method === "GET" && req.url === "/info") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(backend.info()));
      return;
    }
    if (req.method === "POST" && req.url === "/tool") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(body || "{}"); } catch { parsed = null; }
        if (!parsed || parsed.tool !== "mix") {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "unknown tool '" + (parsed && parsed.tool) + "'" }));
          return;
        }
        const { op, params } = parsed.args || {};
        let result;
        try { result = backend.call(op, params || {}); }
        catch (e) { result = { ok: false, error: String((e && e.message) || e) }; }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      });
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not found" }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    backend,
    server,
    teardown: () => { try { server.close(); } catch { /* already closed */ } },
  };
}
