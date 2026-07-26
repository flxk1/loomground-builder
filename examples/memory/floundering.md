# Floundering log — mental-twin skill test (MCP memory server target)

An honest record of every point where the skill's content was insufficient,
ambiguous, or wrong for this run. Ordered roughly by severity.

## 1. The empty-graph deadlock: the skill as written produces a useless twin

`surface-mcp.md` is strict that during fixture capture "Only call tools whose
annotations mark them read-only" and "an unannotated tool is not called". A fresh
memory server has an **empty graph**: every permitted read returns
`{"entities": [], "relations": []}`. Followed literally, the skill yields a twin
whose every view renders nothing — there is no sanctioned way to get non-empty
read fixtures. I only escaped because the test brief explicitly authorized seeding
through the server's own write tools as recorded test setup. The skill itself
needs a "seeding is permitted as recorded setup, before read capture" clause (and
a rule for where the seed records live), otherwise fresh-state targets are
untestable.

## 2. SKILL.md's cycle and checklist speak RVND vocabulary the MCP path doesn't have

Step 1 says "record each op's `mutates` stamp"; the checklist gates on "every op
stamped `mutates` (or unstamped — fail-closed)". MCP has no `mutates` stamp — it
has `readOnlyHint`/`destructiveHint`/`idempotentHint`. The translation
(`mutates` ≈ `readOnlyHint` absent/false) is in the surface-mcp gate map, but the
checklist never says so, so completing it "honestly" required me to decide that
"stamped mutates" means "not readOnlyHint: true" — a guess about intent, recorded
here. Same for the confirm-card wording "that it will be recorded": recorded
*where*? For RVND that presumably means a decision log; for the memory server I
guessed "recorded in the server's memory file". The checklist should either use
surface-pack-neutral wording or delegate vocabulary to the surface pack.

## 3. What does a gated write DO in a fixture-backed twin? The skill never says

The skill demands confirm cards for writes and forbids optimistic success, but is
silent on the terminal state of a confirmed write when no live server exists.
Options I weighed: disable the confirm button (then gating can never be
walked through), pretend (forbidden), or invent a terminal failure-styled state. I
invented "NOT SENT — call not dispatched; graph unchanged" and a call log. I think
that honours "render, never simulate", but it is my design, not the skill's — the
skill should specify the fixture-mode behaviour of gated controls.

## 4. Read controls with free arguments vs. frozen fixtures

`search_nodes` takes an arbitrary query, but a fixture-backed twin can only replay
the queries that were captured. The skill says fixture views must be labelled, but
gives no pattern for *parameterised* reads: is a search box even allowed? I chose
to allow the input, replay captured queries, and answer anything else with an
explicit "no fixture captured for this query — live server required" refusal
(rather than reimplementing the server's matching client-side, which would be
simulation). This whole pattern — replayable-arguments-with-refusal — had to be
invented.

## 5. No instruction to record *which arguments* produced a read fixture

"Save each read response verbatim" — but a verbatim response alone doesn't tell
the twin (or an auditor) what call produced it. `search_nodes-graph.json` is
meaningless without knowing the query was "graph". I invented
`fixtures/manifest.json` (file → method/params) and request+response wrappers for
the seed records. The skill should mandate a capture manifest format.

## 6. Checklist lines that cannot bind to this target

"Decision options render unranked, no default … recording demands a rationale
field" and "severity order respected" assume a governance/decision surface (RVND).
The memory server has none. The checklist says a failed line is fixed or recorded
as a limitation — but these lines neither pass, fail, nor limit; they are
inapplicable. I recorded them as NOT APPLICABLE with reasons, a category the
checklist doesn't officially have.

## 7. The "verify nothing fired" walkthrough check is near-vacuous in fixture mode

"Drive one gated flow to the confirm card and cancel; verify nothing fired (server
log / fixture untouched)". With no transport between page and server, nothing can
ever fire, so the check proves little. I verified it anyway three ways (empty call
log, zero browser network requests, unchanged SHA-256 of the server's memory
file), but the strongest of these — the file hash — only shows the *driver* isn't
running, not that the page is well-behaved. The skill should say what evidence
counts in fixture mode (I'd argue: the zero-network-requests observation).

## 8. Things figured out from the server source / SDK behaviour, not the skill

- That responses carry the payload twice (`content[0].text` JSON string *and*
  `structuredContent`) — the digest never mentions `structuredContent`, and I had
  to decide which one the twin renders (I chose `structuredContent`, falling back
  to parsing the text).
- That tool-level failures arrive as `isError: true` with the refusal inside
  `content[0].text` (not as JSON-RPC errors) — the digest names both but gives no
  example shape; I captured a real one to be sure.
- That the server emits `notifications/resources/updated` mid-stream, which a
  naive line reader must skip — the digest's protocol recipe doesn't warn that
  unsolicited notifications can interleave with responses.
- Stderr noise ("Knowledge Graph MCP Server running on stdio") must not be parsed
  as protocol — again learned by running it, not from the digest.

## 9. Minor frictions

- The digest hardcodes `protocolVersion: "2025-06-18"` with no guidance for
  version negotiation if the server answers with a different version (it didn't
  here, but the recipe fails silently in that case).
- Step 2 says "Ask for brand assets…" — in a single-shot request there is no
  ask-back; the user's "warm, minimal, light" is a named aesthetic, so I proceeded,
  but the skill doesn't say whether a named aesthetic in the request satisfies the
  ask or whether the twin-builder must still confirm.
- Resources: the digest says resources are "additional state views for the twin"
  — it's unclear whether declared resources *must* be captured/rendered. I
  captured them and documented why they aren't rendered (duplicate of
  `read_graph`), but whether that omission belongs on the mandatory exclusion list
  (which is defined over "catalogued functions", i.e. tools) is a judgement call.
- "One static HTML file … no build step" vs. embedding fixtures verbatim: hand-
  copying 40 KB of JSON into a script tag invites transcription errors, so I used
  a one-shot injector script at authoring time. The delivered file needs no build
  step, but the checklist wording leaves it ambiguous whether authoring-time
  tooling violates the line.
