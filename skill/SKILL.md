---
name: mental-twin
description: Generate a mental twin - a simple, functional UI reproducing the
  functions of a tool with a machine-readable surface. v0.4 test build -
  reads the target's live catalogue and mutation metadata, generates a
  delta-zero twin (every catalogued function reachable, by construction) via
  a cascade of narrow stages (genre-select, substrate, layout, bind, gate,
  critique) and verifies it against the bundled checklist plus a mandatory
  visual loop. Content-only skill; all execution uses the target's own free
  tooling. Triggers - "make a twin of this tool", "give this backend a UI",
  "twin this workflow", "build me a simple console for X", "I want to see
  what my agent can do".
---

# mental-twin (v0.4 test build) - the orchestrator

A twin reproduces the functions of a thing in a simple UI. Derive it from the
thing's own catalogue; never re-describe the thing. The tool decides state and
verdicts; the twin renders them; the checklist decides conformance. Generate
form, never meaning.

This file is the **entry point**: the cascade below, routing to one narrow
skill per stage or per genre, plus the invariants that hold across every one
of them. Start here, then follow the links - a Claude reading this file plus
the stage/genre files it points to has everything the old single-file skill
held, organized by what changes per genre (`genres/*/GENRE.md`) versus what
never does (`stages/*.md`).

**Delta-zero.** A twin renders the target's *entire* catalogue - every
function the target can invoke is reachable in the twin, by construction.
"Excluded" is not a legal outcome of scoping (see `stages/gate.md`'s
Completeness section): narrowing what a twin renders is now an emphasis
decision (which functions earn a designed tier-1 surface - `genres/rack/GENRE.md`'s
tier model) never an existence decision (whether a function is reachable at
all). This replaces the earlier version's exclusion list, which measured as
structural narrowness across two live test runs (~13-15 of ~252 catalogued
ops in scope, the rest silently unreachable) even when quality was explicitly
demanded.

Targets are read through a surface reference: the generic MCP digest
(`references/surface-mcp.md`) by default, or a per-target surface pack where
the consuming project supplies one - such packs live with the target/plane
that uses this skill (RVND's, for example, in loomground-patchbay's
rvnd-design/), never in this repo. The surface reference owns all
target-specific vocabulary - discovery mechanism, mutation metadata, what
"recorded" means there. This file speaks only in neutral terms. Verification
is the checklist (`references/checklist.md`), executed in full, the visual
loop (`stages/critique.md`), and the gates - the structural gate
(`sheet/gate.mjs`) and the live Definition-of-Done gate
(`specs/definition-of-done.md`, summarized in `stages/gate.md`): a twin is
done only when it actually controls the real backend.

## The cascade (never skip a stage)

Each node below is individually gated; each is a narrow skill file, not a
step number - loops close the graph (gate failures send you back to
bind/layout; critique failures send you back to substrate/genre):

```
ingest        → read the catalogue + persona/brand; capture fixtures  — this file + stages/fixtures.md
      │
genre-select  → graph SHAPE → which genre                              — stages/genre-select.md
      │
substrate     → the genre's primitive kit                              — genres/<genre>/GENRE.md
      │
layout        → relationships → arrangement                            — stages/layout.md
      │
bind          → every control ← {op, params, gesture}                  — stages/bind.md
      │
GATE: DoD     ← the twin actually controls the real API      ⟲ fails → back to bind/layout
      │
critique      ← visual/craft loop                            ⟲       → substrate/genre
      │
   the twin   → stages/fixtures.md (delivery) — a static HTML file, fixtures, rationale
```

1. **Ingest.** Read the inside, as `stages/fixtures.md` details: reach the
   target through its surface reference, pull the function catalogue and
   each function's mutation metadata (a function without mutation metadata
   is treated as mutating - fail-closed, see Rules below - and a function's
   own declared mutation metadata always wins over any prose, note, or name
   describing it as a read), and capture fixtures. Output: the surface
   profile - the action inventory with gate requirements, plus the reads
   available for state.

   **Read the person and the brand**, alongside ingest. A named aesthetic or
   operator profile in the user's request counts as supplied - proceed on it
   and record it as the source. Ask only when the request carries neither;
   if nothing can be obtained, use a plain neutral identity and say so in the
   rationale. Never invent brand facts.

2. **Genre-select.** Choose genre and mode by the graph shape of the mental
   model - `stages/genre-select.md`'s detection heuristic, routing to one of
   `genres/rack/GENRE.md`, `genres/synth/GENRE.md`, `genres/daw/GENRE.md`, or
   `genres/spatial/GENRE.md`. Map every function to a tier (tier 0 palette,
   tier 1 designed, tier 2 generated rack - `genres/rack/GENRE.md`'s tier
   model, reused unchanged by every genre) and record the tier map in the
   rationale and the twin's own surface table.

3. **Substrate.** Compose the twin from the bundled component sheet
   (`sheet/` in this package: `twin-sheet.css` + `twin-sheet.js`, contract
   `twin-sheet/1`) - copy both files verbatim into the twin (the same
   authoring-time injection as fixtures) together with exactly one binding:
   the target's contract binding where the consuming project supplies one
   (loaded after the theme token block) or `sheet/binding-default.css`
   otherwise; a custom brand becomes a new binding file, never edits to
   components. For any genre besides the rack, also copy that genre's own
   kit (`genres/<genre>/*-kit.{js,css}`) alongside the sheet, per that
   genre's `GENRE.md`. The sheet carries the type scale, spacing scale,
   density modes, lamps, rack/op-surface family, palette, and confirm
   gating - compose these components; do not freestyle parallel CSS or a new
   size scale (freestyling is exactly the sprawl measured across two live
   runs: 4 ad-hoc sizes, then 13, neither a scale). Cite the sheet's version
   marker in the rationale. The sheet's demo (`sheet/demo.html`) is the
   worked example; its gate (`sheet/gate.mjs`) shows the behavioural
   contract you inherit.

4. **Layout.** Arrange the genre's primitives on top of the fixed scale,
   never underneath it - `stages/layout.md`.

5. **Bind.** Wire every control to `{op, params, gesture}` - the Control
   grammar. Every control - a rack button, a knob, a patch-cable endpoint, a
   room-tile, whatever a genre's substrate renders - carries the three
   machine-readable hooks (`data-op`, `data-param`, `data-gesture`) that make
   it drivable regardless of genre, dispatching through the twin's own
   bridge to the target's real transport. Full contract: `stages/bind.md`.

6. **Gate.** Run the structural gate (`npm test`), then, where the target
   offers a browser-reachable transport, the live gate (`npm run
   test:live[:<genre>]`) - G0-G6 against the real backend via an
   out-of-band witness the twin never touches. Full DoD (D1-D6) and how to
   run every gate: `stages/gate.md`. A twin is not done until this stage is
   green.

7. **Critique.** Render → screenshot → critique against the brief and
   against craft; revise; re-render. Mandatory - `stages/critique.md`. No
   render environment reachable: ship anyway, but stamp the twin
   "design-unverified" and say why.

8. **Deliver.** The twin file, its fixtures (with manifest), and a short
   rationale: genre choice, the tier map, per-control function mapping,
   brand sources, the chosen type/spacing scale, every checklist line's
   outcome, the visual loop's outcome or design-unverified reason, the gate
   outcomes (structural, and live or the live-unverified reason), known
   limitations.

## Control grammar (summary)

`{op, params, gesture}` is the one contract a genre-blind harness can drive.
Every control carries `data-op="facade.op"` (the exact catalogued function
name, naming convention in `genres/rack/GENRE.md`), `data-param="pname"` on
each of its value fields, and `data-gesture` naming what fires it - an open
vocabulary (`activate`, `turn`, `patch`, `fade`/`pan`/`mute`/`route`/`trigger`,
`dial`/`step`/`link`, and whatever a future genre needs), with `activate`
alone structurally special because it is the one gesture that opens a shared
op-surface first. The live gate dispatches on this structure, never on a
control's visible label or which gesture word it carries beyond that one
`activate` check - full contract in `stages/bind.md`.

**Genre system.** Genre is chosen by the graph shape of the mental model, not
picked from a fixed list. Four genres are proven today, each a real backend +
real live gate run: the governance rack, the modular synth, the DAW, and the
spatial 3D control room - `stages/genre-select.md` for the detection
heuristic and the full proof list, each `genres/*/GENRE.md` for that genre's
substrate, gestures, and example twin.

## The Definition of Done (summary)

A twin is done when, in the genre that fits the tool, it passes D1-D6
(control causation, completeness, fidelity, honesty, genre-agnosticism,
lossless degrade) - `stages/gate.md` for the full DoD, the three verification
layers (structural / live / visual), and how to run every gate.

## Rules

**One catalogue, two faces.** Every control invokes a real catalogued
function; every state view comes from a real read. Nothing invented, nothing
silently omitted.

**Delta-zero.** Every catalogued function is reachable in the twin - tier 1 or
tier 2, never neither. Narrowing scope is an emphasis decision (genre-select
stage), not an existence decision; a user approving a narrower *existence*
scope does not make the rest of the catalogue optional.

**Fail-closed gating.** Read-marked functions may run freely; everything
else confirms first. Absence of mutation metadata is not permission - not
for rendering, and not during fixture capture either.

**Render, never simulate.** No optimistic success, no computed verdicts, no
cached state presented as live. Responses render in the target's words,
verbatim - including ugly ones. Presentation-level rewriting is not permitted;
the twin may add separate labels or explanation without altering target output.

**Status rendering.** Status values are rendered verbatim as discrete lamps
with text labels - no scores, no dials, and colour is never the only signal
(`sheet/twin-sheet.js`'s `lamp`, checked by `references/checklist.md`'s
Doctrine section). Requested state is never shown as granted.

## References

- `stages/fixtures.md` - ingest + the fixture discipline (capture, manifest,
  labels, NOT SENT, parameterised reads, cancel evidence).
- `stages/genre-select.md` - the graph-shape → genre heuristic and the D5
  proof list.
- `stages/layout.md` - relationships → arrangement, and the fixed scale
  every genre composes on top of.
- `stages/bind.md` - the Control grammar in full: the three hooks,
  surface-vs-direct dispatch, and the transport.
- `stages/gate.md` - D1-D6, the three verification layers, and how to run
  every gate.
- `stages/critique.md` - the mandatory visual/craft loop.
- `genres/rack/GENRE.md`, `genres/synth/GENRE.md`, `genres/daw/GENRE.md`,
  `genres/spatial/GENRE.md` - one genre each: graph-shape fit, substrate,
  gestures, tiers, proof.
- `references/surface-mcp.md` - generic MCP digest: stdio protocol, gate map
  from annotations, capture and seeding rules.
- `references/checklist.md` - the verification checklist; the delivery gate
  until the conformance kit exists.
- `../specs/definition-of-done.md` - the Definition of Done (G0..G6) and the
  target-agnostic gate/adapter contract behind the gate stage.
- `../testing/live/` - the live gate (`live-gate.mjs`) and its adapters; run
  with `npm run test:live`. The structural gate is `sheet/gate.mjs`
  (`npm test`).
- `generate-backend.md` - the inverse direction: manual → generated backend,
  when the source is a manual rather than a running system.
- `sheet/twin-sheet.css`, `sheet/twin-sheet.js`, and
  `../specs/twin-component-sheet-spec.md` - the shipped tier-1/tier-2
  component substrate and its contract.
