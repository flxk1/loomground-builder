# Rationale — mental twin of the MCP memory server

Target: `@modelcontextprotocol/server-memory` v0.6.3 (`memory-server`, MCP protocol
2025-06-18, stdio). Surface read via the generic MCP digest
(`references/surface-mcp.md`); fixtures captured 2026-07-23 with a stdio JSON-RPC
driver script (test tooling, kept in the session scratchpad; capture parameters are
recorded in `fixtures/manifest.json`). The server's own memory file was a
scratchpad-local `memory.json`; its SHA-256 after capture was
`f92cc7e661b1a97a8fc39c3b1adad3f5a15a124cd0e59687d9210b4f5a5b81fd`.

## Genre choice

**Tool twin.** The memory server is a single tool with one shared state (the
knowledge graph), no workflow stages, and no governance verdicts. The operator is a
single researcher curating a personal knowledge graph, so the twin is a one-page
console: see the graph, search it, add to it behind confirm cards.

## Mode: fixture-backed

The target is a stdio process with no HTTP surface, so a static HTML page cannot
reach it (no same-origin serving, no CORS). Per the skill, fixtures were captured
first and the twin is fixture-backed, labelled as such in a page-level banner and a
per-view source chip on every section. Write calls cannot be dispatched; a
confirmed write is logged as **NOT SENT** and never rendered as success.

## Test setup: seeding (recorded)

A fresh server has an empty graph, so read fixtures would have been empty. As test
setup the graph was seeded through the server's own write tools via the driver
(`create_entities`, `create_relations`, `add_observations`). Every seed call is
recorded verbatim — request and response — in `fixtures/seed-*.json`. Seed files
are setup records; no twin view renders from them. All twin views render from the
read-only captures made afterwards.

## Scope and per-control op mapping

| Twin control / view | Catalogued op | Fixture |
|---|---|---|
| "Your graph" SVG + entity cards + entity detail | `read_graph` | `read_graph.json` |
| Search (replay of captured queries) | `search_nodes` | `search_nodes-graph.json`, `search_nodes-osaka.json`, `search_nodes-nomatch.json` |
| "Replay captured error call" | `search_nodes` (invalid args, `isError: true`) | `error-search_nodes-missing-query.json` |
| Open nodes (captured call replay) | `open_nodes` | `open_nodes-emily-chen.json` |
| "Add an entity" form → confirm card | `create_entities` | none (write; cannot fire in fixture mode) |
| "Add a relation" form → confirm card | `create_relations` | none (write; cannot fire in fixture mode) |
| "Add observations" form → confirm card | `add_observations` | none (write; cannot fire in fixture mode) |
| Header pin | `initialize` | `initialize.json` |
| "Server surface & scope" table | `tools/list` | `tools-list.json` |

### Exclusion list (every catalogued function not in scope)

- `delete_entities` — `destructiveHint: true`; deletion is outside the requested
  scope ("I want to see my graph and add to it safely"). Shown as *excluded* in
  the twin's surface table.
- `delete_observations` — same reason.
- `delete_relations` — same reason.
- MCP resources (`memory://knowledge-graph`, declared in server capabilities):
  captured as `resources-list.json` / `resources-read.json` but not rendered — the
  resource is the same graph JSON that `read_graph` returns, so a view would be a
  duplicate. Recorded here so the omission is not silent.

## Gating

Annotation stamps were taken verbatim from `tools/list` (all nine tools are fully
annotated). Per the gate map: the three `readOnlyHint: true` tools render
ungated views; the three creation tools (`readOnlyHint: false`,
`destructiveHint: false`) sit behind confirm cards stating the op, the exact
JSON-RPC params, the annotations verbatim, and that the call would be recorded in
the server's memory file; the three `destructiveHint: true` tools are excluded
entirely. Nothing fires on load or render — the page makes zero network requests.

## Brand decisions and sources

No brand assets were supplied. The operator supplied a named aesthetic in the
request — "warm, minimal, light" — and an operator profile ("a researcher who
curates a personal knowledge graph"). Derivation, stated so nothing is invented:

- **Warm**: off-white paper background `#FBF7F1`, warm brown ink `#40372E`,
  terracotta accent `#C0633B`, earthy entity-type hues (olive, plum, sage, ochre).
- **Minimal**: one column, system font stack, no imagery, no external assets.
- **Light**: light theme only; generous whitespace; thin warm-grey hairlines.

All colours, radii, and fonts live in one `:root` custom-property block
(`--bg` … `--font`); restyling is a token swap.

## Checklist results (references/checklist.md, every line)

### Completeness
1. **Every control maps to a catalogued op** — PASS; mapping table above.
2. **Every rendered state from a real read; fixture views labelled** — PASS; all
   views render embedded captured responses, each section carries a
   "Fixture · <op>" chip and the page carries a fixture-backed banner.
3. **Excluded functions listed** — PASS; exclusion list above and in the twin's
   surface table.

### Gating
4. **Mutating/unstamped ops behind confirm card (op, params, recorded)** — PASS;
   verified in browser: confirm card shows op name, verbatim annotations, full
   `tools/call` params JSON, and the recording notice.
5. **No write fires on load/render/other interaction** — PASS; the page makes no
   network calls at all (browser network log: zero requests beyond the page
   itself), and the call log stays empty until an explicit confirm.
6. **Refused/errored call renders in the server's words** — PASS; the captured
   `isError: true` response ("MCP error -32602: Input validation error …") is
   rendered verbatim under an ERROR lamp, styled as failure.

### Doctrine
7. **Verdict/status vocabulary verbatim** — PASS (vacuously narrow): this server
   defines no verdict vocabulary; its only status signal is `isError` plus message
   text, which the twin renders verbatim. No ordering is shown, so none to respect.
8. **Discrete lamps, no dials/gauges/scores** — PASS; three discrete lamp states
   (FIXTURE / NOT SENT / ERROR), each with a text label; no numeric derivations.
9. **Colour never the only signal** — PASS; lamps carry text, entity-type colours
   are paired with type text on nodes, cards, and legend; ARIA labels on the SVG.
10. **Decision options unranked, rationale field on recording** — NOT APPLICABLE,
    recorded with reason: the memory server catalogues no decision/option ops, so
    there is nothing this line can bind to.
11. **Nothing requested shown as granted** — PASS; a confirmed write renders NOT
    SENT, the graph view does not change (verified: still 5 entities after
    confirm), and no pending state is merged into any view.

### Artifact class
12. **One static HTML file, inline script, no build step** — PASS; `twin.html` is
    self-contained and runs from disk. (Note: fixtures were embedded by a one-shot
    injector script at authoring time to keep them verbatim; the delivered file
    needs no build step.)
13. **No external origins** — PASS; no `src`/`href`/`@import`/`url()` references
    at all; the only URL strings in the file are `$schema` identifiers inside the
    embedded `tools/list` fixture data. Zero network requests observed.
14. **Identity in one `:root` token block** — PASS.

### Walkthrough (performed in a browser via a local static file server)
15. **Opens with every surface rendering, no console errors** — PASS; console
    empty.
16. **One read flow end to end, state matches fixture** — PASS; replayed
    `search_nodes(query: "graph")`; rendered entities/relations match
    `fixtures/search_nodes-graph.json`.
17. **Gated flow to confirm card, cancel, nothing fired** — PASS; cancelled
    `create_entities` confirm; call log unchanged, zero network requests, and the
    server's memory file hash is unchanged
    (`f92cc7e6…`, identical before and after the browser session — though note the
    page never had transport to it, so this check is necessarily indirect).
18. **Live-mode gated flow through confirm** — NOT APPLICABLE, recorded with
    reason: no same-origin live mode exists for a stdio server; there is no HTTP
    bridge in scope for this build. Known limitation below.

**Tally: 16 pass, 2 not applicable with recorded reasons, 0 failed.**

## Known limitations

- **No live mode.** The twin cannot reach the stdio server from a browser; all
  reads are replays of captured calls and writes terminate at NOT SENT. Making the
  twin live would require a small local HTTP/WebSocket bridge in front of the
  stdio process; that bridge is out of scope for this build.
- **Search and open_nodes only replay captured arguments.** Any other query gets an
  explicit "no fixture captured" refusal rather than a client-side reimplementation
  of the server's matching (render, never simulate).
- **Fixtures are a snapshot** (2026-07-23, seeded five-entity graph). The graph
  view will not reflect later server state until fixtures are recaptured and
  re-embedded.
- **MCP resources are captured but not rendered** (duplicate of `read_graph`).
