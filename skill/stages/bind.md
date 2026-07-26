# Stage: bind — the Control grammar

Cascade position: `substrate → layout → **bind** → gate`. Genre-independent —
this is the one contract every genre's substrate must emit so the same live
gate can drive it, whether the substrate rendered a rack button, a synth
knob, a DAW fader, or a spatial station-tile.

**Naming convention.** Every catalogued function is named `facade.op` — the
full dotted name (e.g. `urlshortener.remove`, not `remove`) — everywhere it
appears as a control label. This is the identifier value `data-op` carries
below, and it is what the component sheet's confirm flow
(`../sheet/twin-sheet.js` `confirmGate`, with `opts.typedName`) requires the
operator to type, the full dotted form, before a destructive op's confirm
enables. The full naming discipline, and why the rack genre's tier-2 pattern
is where it is enforced structurally, is in `../genres/rack/GENRE.md`.

## The three hooks

The visible label is not what makes a control drivable - form is free, the
*contract* is fixed. Every control - a rack button, a knob, a patch-cable
endpoint, a room-tile, whatever a genre's substrate renders - carries three
machine-readable hooks, emitted by the component sheet
(`../sheet/twin-sheet.js`'s `opRow` and `opSurface`) so the twin's genre never
matters to whether it can be driven:

- **`data-op="facade.op"`** - on the control element itself, whatever its tag
  or form. The exact full dotted function name, the same identifier the
  naming convention above fixes. This is what the gate keys on to find and
  drive a control - never the control's visible text.
- **`data-param="pname"`** - on each parameter input/textarea/select that
  belongs to that control's op-surface. The exact catalogued param name, not
  a label-text guess.
- **`data-gesture`** - on the control element, naming the gesture that
  invokes the op. This vocabulary is **open**: a genre names its own gesture
  words honestly, per control shape - `activate` (a rack button's
  click/press), `turn` (a synth knob's commit), `patch` (a synth cable
  endpoint's commit), `fade`/`pan`/`mute`/`route`/`trigger` (the DAW genre's
  fader/pan/mute/routing/transport controls), `dial`/`step`/`link` (the
  spatial genre's station/door/adjacency controls), and any further word a
  future genre needs. Nothing in the grammar or the gate enumerates this
  list; only one word is structurally special - `activate` - because it is
  the one gesture that opens a shared op-surface before it can be filled.
  Every other word, whatever a genre calls it, works the same way: the
  control's own params live beside it in its local widget (a `data-param`
  input inside the control's own `[data-control-group]`, not behind a
  click-to-open panel), and firing means filling those then committing.

## Surface-vs-direct dispatch

This is the invariant that keeps every genre gate-able: the live gate
(`../../testing/live/live-gate.mjs`) locates a control by
`[data-op="facade.op"]` (exact match), then dispatches on **structure, not on
the gesture word** - a two-way branch, never an enumerated gesture list:
`activate` opens a shared op-surface and fills its `[data-param]` fields;
every other gesture (whatever a genre calls it) fills the control's own local
`[data-param]` fields instead (scoped to its nearest `[data-control-group]`
ancestor, never document-wide, so several controls sharing one `data-op` -
e.g. one fader per track, one knob per module - never collide) and fires the
control directly. Never by scanning button text or field labels, and never by
checking which word `data-gesture` carries beyond the one `activate` check.

A rack button, a knob, a cable endpoint, and a fader are driven identically in
*shape* (find → fill → fire → handle the confirm dialog if one opens -
confirm-gating itself is gesture-independent, `../sheet/twin-sheet.js`'s
`confirmGate`, fail-closed for every mutating op regardless of what fired it)
even though the *mechanics* of filling differ between the surface path and
the direct path; only their tag, layout, and visual form differ beyond that.
Renaming a control's visible label changes nothing the gate depends on; only
changing `data-op` or moving a gesture between the two mechanisms (naming it
`activate` or not) does. A genre is free to invent as many direct-gesture
names as its controls need - the gate never has to be taught a new one.

Every mutating op's confirm card states the function, its exact composed
parameters, and the consequence in the target's terms (conditional wording in
fixture mode); functions marked destructive get the strongest confirm framing
and the typed-name gate above.

## The transport

Once a control fires, it dispatches through the twin's own bridge to the
target's real transport: a browser-reachable same-origin call in live mode
(the `dispatch(fn, params)` promise every genre kit's `fireControl` calls
into), or, in fixture mode, composition-only, terminating in the explicit
NOT SENT state (`fixtures.md`'s fixture discipline). The protocol the
transport speaks to the target - stdio JSON-RPC for a generic MCP server, or
whatever a per-target surface pack defines - is `../references/surface-mcp.md`'s
concern, not the Control grammar's; bind.md fixes only the shape a control
must emit to be found and fired, not how the call reaches the target.

## Why this stage exists genre-independently

Four genres are proven against this one unchanged grammar and one unchanged
gate, over four real backends: the governance rack, the modular synth, the
DAW, and the spatial 3D room - see each genre's own `GENRE.md` for its
gesture words, its substrate, and its live-gate proof. `{op, params,
gesture}` is the one contract a genre-blind harness can drive, so the same
live gate proves D1 (control causation) and, run against further genres over
further real backends, D5 (genre-agnosticism in
`../../specs/definition-of-done.md`)
without knowing anything about racks, synths, DAWs, or 3D rooms itself.

## References

- `../sheet/twin-sheet.js` - `opRow`/`opSurface`/`confirmGate` emit the three
  hooks and the confirm flow described above.
- `../genres/*/​*-kit.js` - each genre's direct-gesture controls
  (`fireControl`, `mountKnob`/`mountFader`/`mountStation`, etc.), all built on
  this same grammar.
- `gate.md` - how the live gate drives what this stage binds.
- `../references/surface-mcp.md` - the transport protocol for a generic MCP
  target.
