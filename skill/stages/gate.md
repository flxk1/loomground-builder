# Stage: gate — the Definition of Done

Cascade position: `bind → **gate** ⟲ back to bind/layout on failure → critique`.
Genre-independent: every property below is judged the same way regardless of
which genre produced the twin, because it judges the Control grammar
(`bind.md`), not a genre's visual form.

## D1-D6 (the universal DoD)

`../../specs/definition-of-done.md` states the Definition of Done a twin must
pass, in the genre that fits the tool:

- **D1 - Control causation (genre-independent).** Every control - knob,
  button, cable, room-tile - drives the real backend and the real state
  changes, verified out-of-band. Verified by the **live gate**'s G0-G6 below.
- **D2 - Completeness (delta-zero).** Every catalogued op is reachable in the
  chosen genre, or the gap is named. Chunked for large surfaces. See "Verify
  with the checklist" below and `../SKILL.md`'s delta-zero rule.
- **D3 - Fidelity.** The mental model is preserved - the 5-point check (flow,
  constraint, spatial-memory, gesture, state-visibility). Checked by the
  checklist's Doctrine section and the visual loop (`critique.md`).
- **D4 - Honesty.** Render, never simulate; provenance/stamp; capability
  visibility (glow=executable, dim=view-only, hidden=absent); reserved-by-law
  renders no control. See `../SKILL.md`'s Rules and the live gate's G5.
- **D5 - Genre-agnosticism, proven.** The same cascade produces a conforming
  twin in >=2 genres over real backends - proven, not claimed, by the four
  genres in `genre-select.md`.
- **D6 - Lossless degrade.** The twin degrades 3D -> 2D -> text without
  losing a function. Proven today by the spatial genre only -
  `../genres/spatial/GENRE.md`.

## The three layers

- **L1 - Structure** (`../sheet/gate.mjs`, jsdom, no backend) - the twin has
  the right controls and gates destructive actions. Fast pre-check. Run:
  `npm test`.
- **L2 - Live** (`../../specs/definition-of-done.md`) - G0-G6 against the real
  backend via a per-target adapter (`../../testing/live/adapters/`). This is
  what makes D1 checkable rather than hoped: G0 provenance, G1
  reachability+schema, G2 read causation, G3 write causation, G4 stub-defeat,
  G5 honesty-on-failure, G6 mutation-safety live (destructive ops fire for
  real, only against fixtures the gate itself created, and the twin's
  confirm-gating matches the declared mutation class). Run: `npm run
  test:live` (default target: `notes`), plus `TWIN_ADAPTER=./adapters/<name>.mjs
  node testing/live/live-gate.mjs` per genre (see genre-select.md's proof
  list for the per-genre npm scripts).
- **L3 - Visual loop** (`critique.md`) - render -> screenshot -> critique.

A twin is **not done** until the structural gate (L1) is green and, where a
live target is reachable, the live gate (L2) is green. A live target that
cannot be reached is recorded like the visual loop's design-unverified stamp
- plainly, in the rationale - never silently skipped.

## Verify with the checklist

Before or alongside the live gate, run `../references/checklist.md` in full,
every line, recording one of its three outcomes (PASS / FAIL / NOT
APPLICABLE) per line. Fix and re-verify. Never deliver a twin with an
unchecked line.

**Completeness (Vollstandigkeit).** Coverage is complete or named - every
catalogued function has a reachable control (delta-zero), and when the
surface is large the gate runs in **chunks** (batch by facade, report
progress) and names any function it could not drive, never a silent cap.

## The generated-backend gate (a sibling concern)

Where the target itself was generated from a manual rather than read live,
`../generate-backend.md`'s procedure has its own gate (B0-B3,
`testing/backend/backend-gate.mjs`, `npm run test:backend:all`) - a different
Definition of Done, for the backend the twin is then gated against, not for
the twin itself. Read `../generate-backend.md` when the source is a manual,
not a running system.

## Conformance kit

`../../conformance/` and `bin/conformance.mjs` run structural and per-genre
live conformance profiles end to end - `node bin/conformance.mjs
conformance/profiles/{room,daw,patch,notes}-live.json` and
`conformance/profiles/structural.json`.

## References

- `../../specs/definition-of-done.md` - G0-G6 in full, the adapter contract,
  the in-repo reference adapter notes.
- `../references/checklist.md` - the verification checklist in full.
- `critique.md` - L3, the visual loop.
- `genre-select.md` - D5's proof, and the per-genre `npm run test:live:*`
  scripts.
