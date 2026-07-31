// Minimal same-origin HTTP bridge for the urlshortener backend scaffold (live
// DoD, L2 — the target of the twin cold test). Reuses
// testing/backend/sources/urlshortener/backend.mjs UNCHANGED; it only serves
// it over HTTP:
//
//   GET  /       the generated urlshortener twin (examples/urlshortener/twin.html)
//   GET  /info   the backend's own provenance stamp (info()) — served, so G0
//                asserts the SERVED backend is the generated one
//   POST /tool   {tool:"urlshortener", args:{op, params}} -> backend.call(op, params)
//
// No auth token — nothing to gate the connection on. Same shape as
// notes_bridge.mjs; only the backend and tool name differ.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "../../backend/sources/urlshortener/backend.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TWIN_FILE = join(HERE, "..", "..", "..", "examples", "urlshortener", "twin.html");

// Two example links, seeded when the bridge starts, so the twin has real state
// to render on load. Witness measures DELTAS around a driven write, so
// pre-existing entries never affect G3/G4/G5.
const SEED = ["https://example.com/one", "https://example.com/two"];

export async function start() {
  const backend = create();
  for (const url of SEED) backend.call("shorten", { url });
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
      req.on("data", (c) => { body += c; if (body.length > 1048576) req.destroy(); }); // cap loopback test-bridge body
      req.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(body || "{}"); } catch { parsed = null; }
        if (!parsed || parsed.tool !== "urlshortener") {
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
