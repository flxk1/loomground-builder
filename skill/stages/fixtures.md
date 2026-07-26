# Stage: fixtures — the fixture discipline

Cascade position: part of **ingest** (`SKILL.md`'s "Read the inside"). Genre-
independent — every genre reads the same catalogue and captures fixtures the
same way before genre-select ever runs.

Targets are read through a surface reference: the generic MCP digest
(`../references/surface-mcp.md`) by default, or a per-target surface pack
where the consuming project supplies one — such packs live with the
target/plane that uses this skill (RVND's, for example, in
loomground-patchbay's rvnd-design/), never in this repo. The surface
reference owns all target-specific vocabulary — discovery mechanism, mutation
metadata, what "recorded" means there.

## What to capture

Start or reach the target as its surface reference describes. Pull the
function catalogue through the target's discovery surface and record each
function's mutation metadata; a function without mutation metadata is treated
as mutating (fail-closed — see `../SKILL.md`'s Rules), and a function's own
declared mutation metadata always wins over any prose, note, or name
describing it as a read — never infer gating from what something is called.
Capture fixtures as the surface reference specifies, including:

- the target's identity/version response (the twin's pin),
- the full catalogue response, verbatim,
- state reads (read-marked functions only),
- at least one real error response — if no compliant call errors naturally,
  provoke one by calling a read-marked function with invalid arguments; that
  is sanctioned and recorded like any capture,
- a capture manifest (see below).

**Live mode.** This capture requirement is for fixture mode. A live twin
drives the real transport at runtime instead of replaying captured
responses, so it need not embed captured fixtures — see `bind.md`'s
transport note and the mode choice in genre-select.md. Everything below this
point is fixture-mode-scoped.

**Fresh-state targets.** If every permitted read returns empty state, seeding
through the target's own write functions is permitted as *recorded setup*,
before read capture: every seed call is saved verbatim (request and
response), seed records are kept beside the fixtures and never rendered as
state, and the rationale names them.

Output of this stage: the surface profile — the action inventory with gate
requirements, plus the reads available for state — which genre-select.md and
every genre's substrate then build on.

## Fixture discipline (fixture mode)

- **Embedding.** A static `file://` page cannot fetch sibling files, so the
  fixture JSON used by the twin is embedded verbatim in the HTML; the
  `fixtures/` directory keeps the canonical copies. Embedding by a one-shot
  authoring-time injector is fine - the delivered file itself needs no build
  step.
- **Manifest.** `fixtures/manifest.json` maps every fixture file to the exact
  call that produced it (method, params). A response without its producing
  call is not a fixture.
- **Labels.** A page-level fixture-backed banner plus a per-view source chip
  naming the fixture. Nothing fixture-backed masquerades as live.
- **Gated writes terminate in NOT SENT.** Confirming a write in fixture mode
  composes the exact call payload, renders it under an explicit
  failure-styled "NOT SENT - no live connection" state, and appends it to a
  visible call log. Never a success state, never a mutated view, no pending
  state merged anywhere.
- **Parameterised reads: replay or refuse.** Free-argument read controls
  (search boxes, lookups) replay captured argument sets and answer anything
  else with an explicit "no fixture captured for this input - live
  connection required" refusal. Reimplementing the target's logic
  client-side is simulation and forbidden.
- **Cancel evidence.** In fixture mode the cancel-a-confirm check is
  evidenced by: zero network requests from the page, and an empty call log
  until an explicit confirm. File-hash checks on server state are
  corroborating, not primary.

## References

- `../references/surface-mcp.md` - the generic MCP surface digest: protocol,
  gate map from annotations, capture and seeding rules in full.
- `../references/checklist.md` - Completeness section checks the manifest and
  fixture labelling delivered here.
