# Genre: daw — DAW/mixer twins

A Claude reading `../../SKILL.md` (the orchestrator) + `../../stages/genre-select.md`
+ this file + `../../stages/bind.md` + `../../stages/gate.md` has everything
needed to build a conforming DAW twin.

## Graph-shape fit

A mixer model - track→bus (structural) + automation/fader-set (temporal) -
renders as a **DAW** (`daw-kit/1`, `../../genres/daw/`).

## Substrate

`daw-kit.js` + `daw-kit.css` (`daw-kit/1`) - its own small vocabulary sitting
*alongside* `twin-sheet/1` (copy both into a DAW twin, load `twin-sheet.js`
first, then call `DawKit.init(window.TwinSheet)` once), additive under
`twin-sheet/1` (does not modify `twin-sheet.js`/`.css` or `synth-kit.js`/`.css`):
the read view and its confirm dialogs still come from the sheet verbatim,
this kit only adds the direct-manipulation control shapes:

- **transport button** (`mountTransportButton`) - play/stop: no params at
  all, the commit *is* the whole gesture, nothing to fill first.
- **track strip** (`trackStrip`, grouping `mountFader` + `mountPan` +
  `mountMuteToggle`) - a track's gain fader, pan control, and mute toggle,
  each wired to one fixed track id.
- **routing assignment** (`mountRouteControl`/`mountUnrouteRow`) - a new
  bus-routing assignment (two free-text/select fields, `data-param="track"`/
  `"bus"`) or removal of an existing one (endpoints shown as text, destructive
  typed-name-gated "Unroute" commit).

Every control here carries the Control grammar's three hooks
(`../../stages/bind.md`) exactly as the rack's and the synth's controls do;
nothing about a fader's, pan control's, mute toggle's, transport button's, or
routing control's visual form is legible to the gate at all. Each control's
own params live beside it in its own `[data-control-group]` wrapper (not
behind a click-to-open modal panel) - the gate scopes its `data-param` lookup
to the nearest such ancestor so multiple faders/pans/mutes sharing one
`data-op` (e.g. one fader per track, all driving `track.setGain`) never
collide.

## Gestures

The DAW genre names its own gestures, honestly, per control shape: `trigger`
for a transport button (no value, just fires), `fade` for a fader, `pan` for
a pan control, `mute` for a mute toggle, `route` for a bus-routing assignment
(new or removed - the same gesture name for both `mountRouteControl` and
`mountUnrouteRow`, since both are the routing control's commit).

## Tiers

Tier 0 (palette) and tier 2 (generated rack, for any op the DAW's designed
view doesn't cover) reuse the rack genre's substrate unchanged - see
`../rack/GENRE.md`'s tier model. Tier 1 here is the transport + strips +
routing this genre's own kit renders.

## Proven

`../../../examples/daw/twin.html` (`npm run test:live:daw`) - whose transport
buttons (`trigger`), faders (`fade`), pan controls (`pan`), mute toggles
(`mute`), and routing assignments (`route`) each name their own gesture word
and still drive the identical, unchanged gate.

## References

- `daw-kit.js` / `daw-kit.css` - the substrate in full, including the
  `fireControl` commit path shared by every control here.
- `../../stages/bind.md` - the Control grammar this genre's controls emit.
- `../rack/GENRE.md` - the tier-0/tier-2 fallback this genre reuses.
