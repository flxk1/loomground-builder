# Genre: spatial — 3D control-room twins

A Claude reading `../../SKILL.md` (the orchestrator) + `../../stages/genre-select.md`
+ this file + `../../stages/bind.md` + `../../stages/gate.md` has everything
needed to build a conforming spatial twin.

## Graph-shape fit

A spatial model - adjacency/direction (relational/structural) - renders as a
**3D control room** (`spatial-kit/1`, `../../genres/spatial/`).

## Substrate

`spatial-kit.js` + `spatial-kit.css` (`spatial-kit/1`) - its own small
vocabulary sitting *alongside* `twin-sheet/1` (copy both into a room twin,
load `twin-sheet.js` first, then call `SpatialKit.init(window.TwinSheet)`
once), additive under `twin-sheet/1` (does not modify `twin-sheet.js`/`.css`,
`synth-kit.js`/`.css`, or `daw-kit.js`/`.css`): the read view and its confirm
dialogs still come from the sheet verbatim, this kit only adds the
direct-manipulation control shapes:

- **station tile** (`mountStation`) - a labelled dial control wired to one
  fixed station id, positioned in 3D space via CSS custom properties
  (`--sx`/`--sy`/`--sz`).
- **door** (`mountDoor`) - two step controls (open/close) wired to one fixed
  door id; current state shown via a lamp, always re-read from the last real
  state, never computed locally.
- **adjacency link** (`mountLinkNew`/`mountUnlinkRow`) - a new adjacency link
  (two free-text station-id fields, `data-param="a"`/`"b"`) or removal of an
  existing one (endpoints shown as text, destructive typed-name-gated
  "Unlink" commit).
- **cord** (`mountCord`) - a purely decorative line drawn between two
  stations' fixed 3D positions, visualising an adjacency link. Carries no
  Control grammar attributes - it is presentation only, hidden entirely at
  `data-degrade="2d"`/`"text"` (see D6 below); the textual link list
  (`mountLinkNew`/`mountUnlinkRow`) is what actually carries the link's
  function in every degrade mode.
- **room** / **floor** (`spatialRoom`/`roomFloor`) - the 3D perspective
  container and the preserve-3d plane every station/door/cord is positioned
  within; visual grouping only, see `../../stages/layout.md`.

Every control here carries the Control grammar's three hooks
(`../../stages/bind.md`) exactly as every other genre's controls do; nothing
about a station dial's, door toggle's, or link control's visual form - a tile
positioned in 3D space via CSS transforms - is legible to the gate at all.

## Gestures

The spatial genre names its own gestures, honestly, per control shape:
`dial` for a station's level control, `step` for a door's open/close toggle,
`link` for an adjacency link's connect/disconnect (the same gesture name for
both `mountLinkNew` and `mountUnlinkRow`, since both are the link control's
commit).

## Tiers

Tier 0 (palette) and tier 2 (generated rack, for any op the room's designed
view doesn't cover) reuse the rack genre's substrate unchanged - see
`../rack/GENRE.md`'s tier model. Tier 1 here is the stations, doors, and
cords this genre's own kit renders.

## Lossless degrade (D6)

The 3D room is CSS 3D transforms (`transform: translate3d/rotateX/rotateY`,
`transform-style: preserve-3d`) applied to real DOM controls - never
Three.js, never WebGL, never a `<canvas>` - precisely so it stays a single
self-contained static HTML file with no external origin and no build step,
and so every control inside it is a real element the live gate can find by
`[data-op]`, the same way it finds a rack button or a knob.

Because the 3D is presentation only, the twin degrades **3D → 2D → text** by
flipping one attribute - `data-degrade="3d"` (default) | `"2d"` | `"text"` -
on the twin root; `spatial-kit.css` keys every transform off that attribute,
and the `[data-op]`/`[data-param]`/`[data-gesture]` control set is
**identical** across all three modes - degrading changes layout and which
purely decorative sub-elements (a station's colour tile, a door's glyph, a
cord's line) render, never which functions exist or fire.

jsdom, which the live gate runs in, has no CSS layout engine at all - so a
passing `npm run test:live:room` is *already* a drive of the twin's "text"
layer, and `../../../testing/live/room-d6.mjs` (`npm run test:d6:room`) makes
that identity explicit and mechanically checked (not just implied) by
asserting the `[data-op]` set is the same at `data-degrade="3d"`, `"2d"`, and
`"text"`. This is the only genre today that proves D6 - see `../../stages/gate.md`.

## Proven

`../../../examples/room/twin.html` (`npm run test:live:room`) - whose station
dials (`dial`), door toggles (`step`), and adjacency-link controls (`link`)
are positioned in walkable 3D space and still drive the identical, unchanged
gate; plus `npm run test:d6:room` for the D6 proof above - together the proof
that the gesture vocabulary really is open, not just a fixed list, and that
3D presentation never costs a function.

## References

- `spatial-kit.js` / `spatial-kit.css` - the substrate in full, including the
  `fireControl` commit path shared by every control here and the degrade
  rules.
- `../../stages/bind.md` - the Control grammar this genre's controls emit.
- `../rack/GENRE.md` - the tier-0/tier-2 fallback this genre reuses.
