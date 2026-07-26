# Stage: critique — the visual/craft loop

Cascade position: `gate ⟲ **critique** ⟲ → substrate/genre`. Genre-
independent in procedure; genre-specific only in what "craft" means for that
genre's substrate (a rack's shelf density, a synth's knob layout, a DAW's
strip alignment, a spatial twin's degrade fidelity).

This loop is **mandatory** - L3 of the three layers in `gate.md`.

## The loop

Render the artifact in a real or headless-with-screenshot browser; take a
screenshot; critique it against the brief (persona, genre) and against craft
(type/spacing scale discipline held to what the substrate stage recorded, a
real layout system rather than ad-hoc positioning - see `layout.md` - lamp
legibility, tier-2 rack readability at scale); revise; re-render. Repeat
until the critique finds nothing further, or one finding is recorded as a
known limitation - never silently dropped.

## No render environment

**No render environment reachable, or the environment cannot produce a
screenshot** (a functional-only jsdom pass does not count as this loop): ship
the twin anyway, but stamp it - a visible "design-unverified" line in the
twin's own header (`../sheet/twin-sheet.js`'s `header`, `opts.stamped`),
plainly worded, plus the reason in the rationale. A twin that completed the
loop carries no stamp; the stamp is never applied speculatively and never
omitted when the loop could not run.

## Identity as tokens

Bind identity as tokens: all colours, radii, and fonts as CSS custom
properties in one `:root` block (the binding file - see
`../SKILL.md`'s substrate section and `../sheet/binding-default.css`), so
restyling is a token swap. The checklist's Artifact class section checks this
mechanically; the critique loop is where a human (or Claude) actually judges
whether the result reads well, not just whether the tokens exist.

## References

- `../references/checklist.md` - "Visual loop" section: the two checklist
  lines this stage's outcome must satisfy.
- `layout.md` - what "a real layout system" means, genre by genre.
- `../sheet/demo.html` + `../sheet/gate.mjs` - the sheet's own worked example
  and behavioural contract, useful as a craft baseline.
