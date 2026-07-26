# Genre: synth — modular-synth twins

A Claude reading `../../SKILL.md` (the orchestrator) + `../../stages/genre-select.md`
+ this file + `../../stages/bind.md` + `../../stages/gate.md` has everything
needed to build a conforming synth twin.

## Graph-shape fit

A signal-patch model - parameter-of-module (structural) + port-to-port
connections (causal/relational) - renders as a **modular synth**
(`synth-kit/1`, `../../genres/synth/`).

## Substrate

`synth-kit.js` + `synth-kit.css` (`synth-kit/1`) - its own small vocabulary
sitting *alongside* `twin-sheet/1` (copy both into a synth twin, load
`twin-sheet.js` first, then call `SynthKit.init(window.TwinSheet)` once): the
read view and its confirm dialogs still come from the sheet verbatim
(`opRow`/`opSurface`/`shelf`/`confirmGate`/`lamp`), this kit only adds the two
direct-manipulation control shapes the rack genre never needed:

- **knob** (`mountKnob`) - wired to one fixed module id (baked in, not
  user-editable - a real knob is wired to one thing); its value input carries
  `data-param` beside it, no click-to-open panel.
- **cable** (`mountConnect`/`mountDisconnectRow`) - a patch-cable endpoint: two
  free-text port fields (`data-param="from"`/`"to"`) plus a commit for a new
  connection; an existing connection's two endpoints are shown as text with a
  destructive typed-name-gated "Unpatch" commit.
- **module** (`synthModule`) - the visual grouping of one module's knobs/
  cables; see `../../stages/layout.md`.

Every control here carries the Control grammar's three hooks
(`../../stages/bind.md`) exactly as the rack's controls do; nothing about a
knob's or a cable's visual form is legible to the gate at all - only
`data-op`/`data-param`/`data-gesture` are. Each control's own params live
beside it in its own `[data-control-group]` wrapper (not behind a
click-to-open modal panel, unlike the rack's op-surface) - the gate scopes
its `data-param` lookup to the nearest such ancestor so multiple knobs/cables
sharing one `data-op` (e.g. one knob per oscillator, both driving
`osc.setFreq`) never collide.

## Gestures

`turn` - a synth knob's commit. `patch` - a synth cable endpoint's commit
(shared by both the new-connection and the disconnect controls - one
composes a connection, one removes one).

## Tiers

Tier 0 (palette) and tier 2 (generated rack, for any op the synth's designed
view doesn't cover) reuse the rack genre's substrate unchanged - see
`../rack/GENRE.md`'s tier model. Tier 1 here is the knobs + patchbay this
genre's own kit renders.

## Proven

`../../../examples/patch/twin.html` (`npm run test:live:patch`) - whose knobs
(`turn`) and patch cables (`patch`) are maximally unlike a rack button and
still drive the identical, unchanged gate.

## References

- `synth-kit.js` / `synth-kit.css` - the substrate in full, including the
  `fireControl` commit path shared by every control here.
- `../../stages/bind.md` - the Control grammar this genre's controls emit.
- `../rack/GENRE.md` - the tier-0/tier-2 fallback this genre reuses.
