// Minimal same-origin HTTP bridge for the room backend scaffold (live DoD,
// L2 — the FOURTH genre, proving D5 for a third time AND proving D6: a
// walkable 3D control room — station dials, door toggles, an adjacency-link
// control — none of them rack buttons, none of them knobs/cables/faders).
// Reuses testing/backend/sources/room/backend.mjs UNCHANGED; this file does
// not reimplement the room, it only serves it over HTTP:
//
//   GET  /       the room twin (examples/room/twin.html)
//   GET  /info   the backend's own provenance stamp (info()) — served, so G0
//                can assert the SERVED backend is the generated one, not
//                trust an in-process import that a mock could impersonate
//   POST /tool   {tool:"room", args:{op, params}} -> backend.call(op, params)
//
// One tool name ("room") for all four facades (station/door/link/room) — the
// backend's op surface is a small fixed set (setLevel, open, close, connect,
// disconnect, state) with no name collisions, so a single wire endpoint is
// enough; the twin's catalogue still groups them into four facades for
// display (station.setLevel, door.open, link.connect, room.state, ...),
// same "facade.op" naming convention as every other twin (skill/SKILL.md).
//
// No auth: like patch_bridge.mjs/daw_bridge.mjs, this bridge takes no
// token — there is nothing to gate the connection on.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "../../backend/sources/room/backend.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TWIN_FILE = join(HERE, "..", "..", "..", "examples", "room", "twin.html");

// start() -> { baseUrl, backend, server, teardown() }. Binds on an ephemeral
// loopback port; a fresh backend instance per call (create()), so repeated
// runs never see stale state. No SEED constant here (unlike notes/
// urlshortener): the backend's own construction already carries the room's
// fixed shape (three stations, two doors, one factory link) — there is no
// create-station/create-door op to seed through.
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
        if (!parsed || parsed.tool !== "room") {
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
