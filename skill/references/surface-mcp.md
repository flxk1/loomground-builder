# Generic MCP surface digest (v0.2)

How to read the inside of any MCP stdio server. Use this when the target is
an MCP server without a dedicated surface pack; a pack shipped with the
target's own plane (RVND's, for example, lives in loomground-patchbay's
rvnd-design/) overrides this where it exists.

## Protocol (stdio, JSON-RPC 2.0, newline-delimited)

1. Spawn the server process. Send:
   `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"mental-twin","version":"0.2"}}}`
2. After the response, send the notification
   `{"jsonrpc":"2.0","method":"notifications/initialized"}`.
3. Catalogue: `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}` —
   returns tools with `name`, `description`, `inputSchema` (JSON Schema),
   and optional `annotations`.
4. Reads for fixtures: `{"jsonrpc":"2.0","id":3,"method":"tools/call",
   "params":{"name":"<tool>","arguments":{...}}}`.
5. Resources, if declared in capabilities: `resources/list` /
   `resources/read` — additional state views. Capture declared resources;
   if one duplicates a tool read, rendering it is optional but the
   omission goes on the exclusion/omission record.

### Protocol realities (learned the hard way; plan for them)

- **Version negotiation:** the server may answer `initialize` with a
  different `protocolVersion`. Adopt the server's answer; if it names a
  version you cannot speak, stop and record it — do not parse on hope.
- **Two payload channels:** results often carry the payload twice —
  `content[0].text` (a JSON string) and `structuredContent`. Prefer
  `structuredContent` when present; fall back to parsing the text. Say in
  the manifest which channel each fixture's rendering uses.
- **Tool-level errors** arrive as a *result* with `isError: true` and the
  refusal text inside `content[0].text` — not as a JSON-RPC error object.
  Both exist; handle both.
- **Unsolicited notifications** (e.g. `notifications/resources/updated`)
  can interleave with responses on stdout. Match responses by `id`; skip
  notifications; never treat them as the answer to a pending call.
- **stderr is not protocol.** Startup banners and logs land there; parse
  stdout only.

## Gate map (annotations → twin behaviour)

| annotation state | twin behaviour |
|---|---|
| `readOnlyHint: true` | ungated; may render as live control / auto-read |
| `destructiveHint: true` | confirm card, strongest framing; consequence text from the tool description |
| `readOnlyHint` absent or false, not destructive | confirm card (it mutates) |
| no annotations at all | treat as mutating and non-idempotent — fail-closed |
| `idempotentHint: true` | a retry affordance is permitted |
| `openWorldHint: true` | the call reaches beyond the server (third parties, the open web); confirm card regardless of other hints, consequence text says effects may be external and unrecallable |
| `openWorldHint: false` | no extra behaviour; effects are local to the server's domain |

Absence of a stamp is never permission.

## Fixture capture

- **What to capture, verbatim:** the initialize result (identity + version —
  the twin's pin), the full `tools/list` response, each read used by the
  twin, at least one real error response, and declared resources.
- **Read-only rule:** during capture, only `readOnlyHint: true` tools are
  called for state.
- **Error capture (required):** if no compliant call errors naturally,
  provoke one by calling a read-marked tool with invalid arguments (e.g. a
  nonexistent id/revision). Capture the `isError` result verbatim — the
  checklist's error-rendering line needs it.
- **Seeding (fresh-state targets):** when every permitted read returns empty
  state, seed through the server's own write tools first, as recorded
  setup: save each seed call verbatim (request and response) as
  `fixtures/seed-*.json`, then capture reads. Seed records are never
  rendered as state.
- **Manifest (required):** `fixtures/manifest.json` maps every fixture file
  to the call that produced it — method, params, and (where relevant) which
  payload channel the twin renders. A response without its producing call
  is not a fixture.
- Record server name and version in the twin header as the pin.

## Doctrine minimum (generic)

- Every control maps to a listed tool; every state view to a captured read.
- Tool errors (`isError`, JSON-RPC errors) render as failures in the
  server's words — never as success, never softened.
- No optimistic success: a call renders as pending until the response is
  in; in fixture mode a confirmed write terminates in the explicit NOT-SENT
  failure state (see `stages/fixtures.md`, Fixture discipline).
- Discrete status rendering with text labels; colour never the only signal.
- Exclusions and unrendered captures are listed in the rationale, never
  silent.
