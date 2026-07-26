# Rationale — mental twin of the MCP filesystem server

Twin: `twin.html` (Case Archive Console). Target: `@modelcontextprotocol/server-filesystem`,
announcing itself as `secure-filesystem-server` v0.2.0, MCP protocol 2025-06-18, spoken over
stdio JSON-RPC. Allowed directory: a sandbox case-file tree created as environment setup
(see manifest.json, `seedRecords`); the server could never touch anything outside it.

## Genre, mode, operator

- **Genre: tool twin.** The target is a single MCP server whose catalogue is one coherent
  tool surface (filesystem operations); there is no workflow or governance layer to twin.
- **Mode: fixture mode.** A stdio child process is not a browser-reachable same-origin
  transport, so every state view replays verbatim captures (2026-07-23) and every confirmed
  write terminates in the explicit NOT SENT state.
- **Operator and brand: supplied in the user request** ("legal archivist organising case
  files. Paper-white, calm, serif headings. Reading and searching must be effortless;
  anything that moves, writes, or reorganises files must be very deliberate"). That request
  is the sole brand source; no brand facts were invented. Realised as tokens in the single
  `:root` block: paper `#FBFAF6`, ink `#26241E`, Georgia serif headings, muted green/amber/
  oxblood lamp palettes, 4px radii. A token swap restyles the twin.
- The "deliberate writes" requirement maps onto the skill's own gating doctrine: all reads
  are one click and ungated; all four mutating tools sit behind confirm cards, the three
  destructive-marked ones additionally require the tool name typed before confirm enables.

## Scope

In scope (12 of 14 catalogued tools): `read_text_file`, `read_multiple_files`,
`list_directory`, `list_directory_with_sizes`, `directory_tree`, `search_files`,
`get_file_info`, `list_allowed_directories`, `create_directory`, `move_file`,
`write_file`, `edit_file`.

### Exclusion list (also shown in the twin's surface table)

| tool | reason |
|---|---|
| `read_file` | The server's own description marks it "DEPRECATED: Use read_text_file instead"; `read_text_file` is in scope. |
| `read_media_file` | The archive sandbox contains no media files, so no fixture could be captured; a free-argument read with zero captured argument sets could only ever refuse. |

Resources: the server's `initialize` capabilities declare `tools` only — no `resources`
capability — so `resources/list` has no referent on this target.

## Per-control function mapping

| control | catalogued function | gate |
|---|---|---|
| Header pin (name, version, protocol, allowed dir) | `initialize` + `list_allowed_directories` | read |
| Overview: Archive root panel | `list_allowed_directories` | read, ungated |
| Overview: Archive tree | `directory_tree` | read, ungated |
| Browse: folder buttons, "Plain listing" mode | `list_directory` (7 captured directories) | read, ungated |
| Browse: "With sizes" mode | `list_directory_with_sizes` (same 7 directories) | read, ungated |
| Reading room: per-document "Open" | `read_text_file` (6 captured documents) | read, ungated |
| Reading room: per-document "Details" | `get_file_info` (6 captured documents) | read, ungated |
| Reading room: case-bundle buttons | `read_multiple_files` (2 captured bundles) | read, ungated |
| Reading room: "Open by path" | `read_text_file` — replay-or-refuse (6 document paths + 2 captured error paths) | read, ungated |
| Search view | `search_files` — replay-or-refuse (9 captured argument sets) | read, ungated |
| Filing: New case folder | `create_directory` | confirm card (mutating) |
| Filing: File document into case | `move_file` | confirm card, destructive framing (typed name) |
| Filing: Write archivist note | `write_file` | confirm card, destructive framing (typed name) |
| Filing: Amend a document | `edit_file` | confirm card, destructive framing (typed name) |
| Surface table | the `tools/list` catalogue itself, annotations verbatim | read |
| Call log | twin-side record of composed calls; every entry is NOT SENT | — |

Gate classes come from the server's own annotations via the surface-mcp gate map:
`readOnlyHint: true` → ungated; `destructiveHint: true` (`write_file`, `edit_file`,
`move_file`) → strongest framing; `create_directory` (`readOnlyHint: false`,
`destructiveHint: false`) → ordinary confirm card. All tools carry
`openWorldHint: false`, so no external-effects wording was required.

## Fixtures

43 files in `fixtures/`, every one mapped in `fixtures/manifest.json` to the exact
producing call (method, params) and the payload channel the twin renders
(`structuredContent.content` where present, else `content[0].text`). Two error captures
were provoked deliberately per the error-capture rule, both via the read-marked
`read_text_file`: a nonexistent path (`error-read-missing.json`) and a path outside the
allowed directory (`error-read-outside.json`). No seed records exist: the sandbox tree was
created as environment setup before the server was first started, not through the server's
write tools; the manifest records this. No captured fixture is unrendered — all 43 are
reachable in the twin (the five early naive search patterns replay their honest
"No matches found" responses).

## Checklist outcomes (references/checklist.md, v0.2)

Walkthrough environment: jsdom 29.1.1 (`scratchpad/walkthrough.mjs`, 32 automated probes,
32 passing). A real browser was attempted first via the sandboxed preview pane, which
renders out-of-project `file://` pages as static snapshots without script execution, so the
checklist's jsdom substitute was used and is recorded per walkthrough line below.

### Completeness

1. Every control maps to a catalogued function — **PASS**. Mapping table above; the surface
   table in the twin lists all 14 catalogued tools.
2. Every rendered state from a real read, fixture views visibly labelled — **PASS**.
   jsdom probes compare rendered text byte-for-byte with the on-disk fixtures
   (overview, browse plain/sizes, reading room, search); page-level FIXTURE-BACKED banner
   plus per-view `fixture: <file>` chips, including the header pin.
3. Excluded functions in the rationale's exclusion list and the twin's surface table —
   **PASS**. `read_file` and `read_media_file` appear in both, with reasons.
4. Manifest maps every fixture to its producing call; seed records marked and unrendered —
   **PASS**. Programmatic cross-check: 43 fixture files ↔ 43 manifest entries, zero
   mismatches, every entry carries method+params+channel. No seed records exist (recorded
   in the manifest with the reason).

### Gating

5. Every mutation-marked function behind a confirm card stating function, exact composed
   parameters, consequence in the target's terms, conditional wording — **PASS**. All four
   mutating tools; card shows the tool name, the full `tools/call` payload as composed, the
   server's own tool description as consequence, and "On a live connection this call
   would…" wording (jsdom W3 probes).
6. Destructive-marked functions carry the strongest framing — **PASS**. `move_file`,
   `write_file`, `edit_file` require the exact tool name typed before confirm enables
   (probed: disabled before, enabled after typing).
7. No write fires on load, render, or any interaction other than explicit confirm —
   **PASS**. The page contains no network API at all (no fetch/XHR/WebSocket/sendBeacon/
   EventSource — grep probe); the call log is empty on load and after cancel.
8. Refused/errored calls render as failure in the target's words; at least one real error
   fixture — **PASS**. Two provoked `isError: true` captures; jsdom probe renders
   "Access denied - path outside allowed directories: …" verbatim inside a failure-styled
   box with a SERVER ERROR lamp.
9. Fixture mode: confirmed write terminates in NOT SENT, appears in call log, no view
   changes — **PASS**. jsdom W3b: confirm on `create_directory` appends a NOT SENT entry
   with the verbatim composed payload; overview and browse renders compared before/after
   and unchanged.

### Doctrine

10. Status vocabulary verbatim, ordering respected — **PASS**. All server text renders
    byte-for-byte (probed); the target defines no status ordering to respect.
11. Discrete lamps, no dials/gauges/scores/percentages — **PASS**. Lamps are bordered text
    chips (READ — ungated / WRITE — GATED / DESTRUCTIVE — GATED / SERVER ERROR /
    NOT SENT); no meter/progress/score elements (probed).
12. Every colour signal has a text label; page makes sense without colour — **PASS**.
    Probe: every lamp has non-empty text; error boxes and chips carry words, not colour
    alone.
13. Decision/option surfaces render unranked with rationale field — **NOT APPLICABLE**:
    the catalogue contains no decision or option surface; all 14 tools are filesystem
    operations.
14. Nothing requested shown as granted; no pending state merged — **PASS**. The only
    requested thing a user can produce is a composed write, and it terminates in the
    failure-styled NOT SENT state in the call log; state views proven unchanged (W3b).

### Artifact class

15. One static HTML file, inline script, no build step — **PASS**. Single 105 KB file; the
    fixture bundle was embedded by a one-shot authoring-time injector
    (`scratchpad/build-twin.mjs`), which the checklist permits; no `<script src>`.
16. No external origins — **PASS**. Grep probe: no http(s) src/href, no `@import`, no
    remote fonts, no network APIs; all assets inline. Embedded fixture data contains only
    filesystem paths, no URLs.
17. All identity in CSS custom properties in one `:root` block — **PASS**. Exactly one
    `:root` block (probed); colours, radii, and font stacks are all tokens.

### Walkthrough

18. Open; every surface renders without console errors — **PASS** (jsdom). Zero script
    errors; all six views, 7 browse folders, 6 documents, 9 search presets, 14 surface
    rows present.
19. One read flow end-to-end; rendered state matches the fixture — **PASS** (jsdom).
    Document open, browse (both modes), and search replay each compared byte-for-byte
    with the on-disk fixture payloads.
20. Gated flow to confirm card and cancel; nothing fired — **PASS** (jsdom). Card opens for
    `move_file`, cancel closes it, call log still empty; the zero-network-requests
    evidence holds a fortiori — the page contains no network API whatsoever.
21. Live mode: gated flow through confirm, response verbatim — **NOT APPLICABLE**: fixture
    mode; the stdio target offers no browser-reachable same-origin transport.

**Tally: 19 PASS, 0 FAIL, 2 NOT APPLICABLE (lines 13, 21, both with reasons).**

## Known limitations

- **Verbatim tree.** `directory_tree` answers with a pretty-printed JSON document and the
  twin shows it exactly as returned. A parsed indentation view would read better for the
  archivist, but presentation-level cleanup of a response is currently not permitted; this
  tension is recorded here per the skill's own instruction.
- **Search is name search.** `search_files` glob-matches file and folder *names* against
  the relative path; it does not search document contents. A legal archivist will expect
  full-text search; no catalogued tool provides it, so the twin surfaces the server's own
  pattern guidance instead. Five early captures with naive patterns ("summary", "*.txt"
  at root scope) replay their honest "No matches found" responses.
- **Replay boundary.** Open-by-path and search refuse any input not captured on
  2026-07-23; the six documents, two error paths, and nine patterns are the entire replay
  surface.
- **Machine paths in fixtures.** Verbatim capture means the sandbox's absolute scratchpad
  path appears throughout fixtures and rendered state.
- **Real-browser walkthrough not performed.** The available preview pane executes no
  scripts for out-of-project `file://` pages; jsdom (an explicitly permitted substitute)
  was used for all walkthrough lines.
- **Retry affordance not implemented.** `write_file` and `create_directory` carry
  `idempotentHint: true`, which *permits* a retry affordance; in fixture mode a retry
  could only re-terminate in NOT SENT, so it was omitted.
- **Single-edit amend form.** `edit_file` accepts an array of edits; the filing form
  composes exactly one `{oldText, newText}` pair per call.
