# Genre: rack — governance/authority twins

A Claude reading `../../SKILL.md` (the orchestrator) + `../../stages/genre-select.md`
+ this file + `../../stages/bind.md` + `../../stages/gate.md` has everything
needed to build a conforming rack twin.

## Graph-shape fit

A governance/authority model - grant→gate relations, in the plan's
Federation-5D terms: intentional (grant→gate) and causal (pipe) - renders as
a **rack** (`twin-sheet/1`, `../../sheet/`). This is the default genre: when
a tool's mental model doesn't fit the signal-patch, mixer, or spatial shapes
`genre-select.md` names, it fits here.

## Substrate

The substrate is `../../sheet/` - `twin-sheet.css` + `twin-sheet.js`,
contract `twin-sheet/1`. Its own small vocabulary: the rack shelf (one
facade, its op-rows), the op-row (one function, its mutation lamp), the
op-surface (the shared params-then-confirm panel an `activate` gesture
opens), and the lamp (verbatim status/verdict rendering). Every other
genre's kit sits *alongside* this substrate, never replaces it - the rack's
`opRow`/`opSurface`/`shelf`/`confirmGate`/`lamp` are what every genre falls
back to for tier-0 and tier-2 (see below).

## Gesture

`activate` - a rack button's click/press. This is the one gesture word that
is structurally special in the Control grammar (`../../stages/bind.md`):
it is the gesture that opens a shared op-surface before its params can be
filled, rather than firing a control's own local params directly.

## The tier-0/1/2 model

Every catalogued function gets a place - none are dropped:

- **Tier 1 - designed instruments.** Persona-core functions, hand-shaped
  composed views (a watch board, an approvals inbox, a decision desk...)
  built around the brief. This is emphasis, not existence - what earns a
  bespoke surface because it is what this persona does most. In a non-rack
  genre, tier 1 is that genre's own designed view (the synth's knobs and
  patchbay, the DAW's transport/strips/routing, the spatial room's stations
  and doors) - built with that genre's own kit, not the rack's.
- **Tier 2 - generated racks.** Every remaining function, grouped by its own
  facade/domain (the catalogue's own grouping), rendered through one generic
  op-surface pattern instantiated once per function: a name-and-note row with
  its mutation lamp, opening into a parameter form (from whatever the
  discovery surface publishes), a confirm gate (from its mutation metadata),
  a verbatim response view, and a call-log entry. The rack shelf and the
  op-surface pattern are designed once and reused for every function in tier
  2, so quality stays uniform across however many functions land there. Every
  proven genre (synth, DAW, spatial) reuses this tier verbatim, unchanged,
  from `../../sheet/twin-sheet.js` - it is the rack genre's substrate doing
  double duty as every other genre's fallback.
- **Tier 0 - the palette.** A search across every function's name, note, and
  facade/domain, jumping straight to its surface (tier 1 or tier 2) - this is
  what makes "every function reachable" true in practice, not just in
  principle, once the catalogue is large. Also reused unchanged
  (`../../sheet/twin-sheet.js`'s `palette`) by every other genre.

Record the tier map in the rationale (which functions are tier 1 and why) and
render it in the twin's surface table. "Excluded" leaves the vocabulary
entirely: a function is tier 1 or tier 2 - never absent.

## The facade.op naming convention

Name every catalogued function `facade.op` - the full dotted name (e.g.
`urlshortener.remove`, not `remove`) - everywhere it appears as a control
label: the rack's op rows, the tier-0 palette, the surface table, and the
confirm dialog. This is the identifier value carried by the Control grammar
(`../../stages/bind.md`, `data-op`), and it is what the component sheet's
confirm flow (`../../sheet/twin-sheet.js` `confirmGate`, with
`opts.typedName`) requires the operator to type, the full dotted form, before
a destructive op's confirm enables. A twin that names its ops any other way
(bare op name, underscored, etc.) will not match what the typed-name confirm
actually checks against. Every other genre's controls carry this same
dotted-name discipline on their own `data-op` (e.g. `osc.setFreq`,
`track.setGain`, `station.setLevel`) - the convention is defined here because
the rack's op-row/op-surface/confirm-dialog are where it is structurally
enforced, but it binds every genre alike.

## Proven

The governance rack is proven by two live twins, each a real backend + real
live gate run: `../../../examples/notes/twin.html` (`npm run test:live`, plus
`npm run test:live:notes:all` for full-catalogue coverage) and
`../../../examples/urlshortener/twin.html` (`npm run test:live:url`, which
adds G6b - a destructive `remove` driven through the typed-name confirm
gate).

## References

- `../../sheet/twin-sheet.js` / `twin-sheet.css` - the substrate in full.
- `../../sheet/demo.html` + `../../sheet/gate.mjs` - the worked example and
  its behavioural contract (`npm test`).
- `../../stages/bind.md` - the Control grammar this genre's `opRow` emits.
