// Minimal same-origin HTTP bridge for the notes backend scaffold (live DoD,
// L2, second live-gate target — proves the harness is target-agnostic).
// Reuses testing/backend/sources/notes/backend.mjs UNCHANGED; this file does
// not reimplement notes, it only serves it over HTTP:
//
//   GET  /       the generated notes twin (examples/notes/twin.html)
//   GET  /info   the backend's own provenance stamp (info()) — served, so G0
//                can assert the SERVED backend is the generated one, not
//                trust an in-process import that a mock could impersonate
//   POST /tool   {tool:"notes", args:{op, params}} -> backend.call(op, params)
//
// No auth: unlike RVND's bridge (X-Workspaces-Token), this bridge takes no
// token — there is nothing to gate the connection on.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { create } from "../../backend/sources/notes/backend.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TWIN_FILE = join(HERE, "..", "..", "..", "examples", "notes", "twin.html");

// A couple of example notes, seeded once when the bridge starts — not
// through the gate's fixture() (notes has no folder/scope concept, so seed
// notes and gate-driven notes share one flat store). This is demo state
// only: it gives the twin's per-note quick-action controls something real to
// act on the moment the page loads, before any gate probe has run. G3/G4
// measure witness DELTAS before/after a driven write, so pre-existing notes
// (seed or otherwise) never affect those assertions either way.
const SEED = ["Buy milk", "Call the plumber"];

// start() -> { baseUrl, backend, server, teardown() }. Binds on an ephemeral
// loopback port; a fresh backend instance per call (create()), so repeated
// runs never see stale state.
export async function start() {
  const backend = create();
  for (const text of SEED) backend.call("add", { text });
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
        if (!parsed || parsed.tool !== "notes") {
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
