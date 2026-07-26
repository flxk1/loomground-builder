# Twin verification checklist (v0.3)

The delivery gate until the conformance kit exists. Every line gets exactly
one outcome, recorded in the rationale:

- **PASS** — verified, with the evidence named.
- **FAIL** — fixed and re-verified, or recorded as a known limitation with
  its reason. Never skipped silently.
- **NOT APPLICABLE** — the line has no referent on this target (e.g. a
  doctrine line about decision surfaces on a target that catalogues none).
  Requires the reason; N/A without a reason is a FAIL.

Vocabulary note: "mutation-marked" means marked mutating by the target's own
metadata as the surface reference defines it (RVND: the `mutates` stamp;
MCP: `readOnlyHint` absent or false). Unmarked functions count as
mutation-marked — fail-closed. A function's own declared mutation metadata
always wins over any prose, note, or name describing it as a read — never
infer gating from what something is called (a surface reference may record a
case where this bit; check it, do not assume the pack's prose is current).

## Completeness

- [ ] Every control in the twin maps to a catalogued function (name the
      function per control in the rationale).
- [ ] Every rendered state value comes from a real read — live or from a
      captured fixture; fixture-backed views are visibly labelled (banner +
      per-view chip).
- [ ] **Mechanical coverage.** Walk the live catalogue and assert a reachable
      surface for every function — tier 1 (designed) or tier 2 (generated
      rack), located via the tier-0 palette. This is a coverage count, not a
      spot check: the number of catalogued functions with a surface equals
      the number of catalogued functions, full stop. Record the tier map
      (which functions are tier 1 and why) in the rationale — that is an
      emphasis record, not an exclusion list; "excluded" is not a legal
      status for any catalogued function.
- [ ] The tier map is also rendered in the twin's own surface table
      (`genres/rack/GENRE.md`'s tier model, reused by every genre — see the
      genre-select stage of `SKILL.md`'s cascade), not just recorded in the
      rationale — the rationale is the record, the surface table is where
      the twin itself shows it.
- [ ] Fixtures carry their manifest: every fixture file maps to the exact
      call (method, params) that produced it. Seed records, if any, are
      present, marked as setup, and rendered nowhere.

## Gating

- [ ] Every mutation-marked function sits behind a confirm card stating the
      function, its exact composed parameters, and the consequence in the
      target's terms (conditional wording in fixture mode).
- [ ] Destructive-marked functions carry the strongest confirm framing.
- [ ] No write fires on page load, on render, or on any interaction other
      than an explicit confirm.
- [ ] A refused or errored call renders as a refusal/failure in the target's
      words — never as success, never softened. (At least one real error
      fixture exists — provoked via a read-marked function with invalid
      arguments if none occurs naturally.)
- [ ] In fixture mode, a confirmed write terminates in the explicit
      NOT-SENT failure state and appears in the call log; no view changes.

## Doctrine

- [ ] Status/verdict vocabulary rendered verbatim; ordering respected where
      the target defines one.
- [ ] Lamps and status indicators are discrete; no dials, gauges, scores,
      or percentages derived from status values.
- [ ] Every colour signal has a text or ARIA label; the page makes sense
      with colour removed.
- [ ] Where the target catalogues decision/option surfaces: options render
      unranked, no default, no recommendation; recording demands a
      rationale field. (N/A with reason where no such surface exists.)
- [ ] Nothing requested is shown as granted; no pending state is merged
      into any state view.

## Artifact class

- [ ] One static HTML file, inline script; the delivered file needs no
      build step (authoring-time fixture injection is permitted).
- [ ] No external origins: no CDN, no remote fonts, no analytics; all
      assets inline or local. (URL-shaped strings inside embedded fixture
      data are data, not origins.)
- [ ] All identity (colours, radii, fonts) lives in CSS custom properties
      in one `:root` block; a token swap restyles the twin.

## Walkthrough

Run in a real browser where one is drivable; a script-executing DOM (jsdom
or equivalent) is an acceptable substitute for the *functional* lines below
— record which was used per line. It is not a substitute for the Visual loop
section: jsdom executes scripts but produces no screenshot.

- [ ] Open the twin; every surface renders without console errors.
- [ ] Drive one read flow end to end; rendered state matches the
      fixture/server response.
- [ ] Drive one gated flow to the confirm card and cancel; verify nothing
      fired. Fixture-mode evidence: zero network requests from the page and
      an empty call log; server-side state hashes are corroborating only.
- [ ] Live mode only: drive one gated flow through confirm and verify the
      target's response renders verbatim. (N/A with reason in fixture
      mode.)
- [ ] **Per tool-kind, at least once.** Where the target exposes more than
      one kind of catalogued function (e.g. op-facade ops discovered through
      a `help`-style op, versus standalone tools catalogued from the
      allowlist plus their own signature — see the surface reference), drive
      one tier-2 rack surface end to end for each kind, not just each
      instance. One surface per kind is required even if every instance of
      that kind was otherwise identical in the coverage count above.

## Visual loop

- [ ] The visual loop ran: render → screenshot → critique against the brief
      and against craft (the recorded type/spacing scale held, a real layout
      system, lamp legibility, rack readability at scale) → revise; repeat
      until the critique finds nothing further or one finding is recorded as
      a known limitation. Record the render path used.
- [ ] No screenshot-capable render path was available: the twin's header
      carries a visible "design-unverified" stamp and the rationale states
      why. A jsdom-only functional pass (no screenshot) still requires the
      stamp — completing the functional Walkthrough lines above does not
      exempt a twin from this one.
