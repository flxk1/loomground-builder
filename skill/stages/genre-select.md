# Stage: genre-select — graph shape → genre

Cascade position: `ingest → **genre-select** → substrate → layout → bind →
gate → critique`. The first genre-specific decision in the cascade; every
stage after this one (substrate, and this stage's own layout/critique detail)
depends on which genre was chosen here.

## The heuristic

Genre is chosen by the graph **shape** of the mental model built during
ingest, not picked from a fixed list. This is the D5 form-independence rule
from `../../specs/definition-of-done.md`:

| graph shape | relations | genre |
|---|---|---|
| governance/authority model | grant→gate relations | **rack** - `../genres/rack/GENRE.md` |
| signal-patch model | parameter-of-module + port-to-port connections | **synth** - `../genres/synth/GENRE.md` |
| mixer model | track→bus (structural) + automation/fader-set (temporal) | **DAW** - `../genres/daw/GENRE.md` |
| spatial model | adjacency/direction (relational/structural) | **spatial** (3D control room) - `../genres/spatial/GENRE.md` |

Each genre is two things: an **nD adapter** (the grammar that projects the
tool's relations onto the fixed 5D spine - see the plan's Dimensions section)
and a **substrate kit** (its own small vocabulary of primitives - the rack's
shelf/op-row/op-surface/lamp, the synth's knob/cable/module, the DAW's
transport-button/fader/pan/mute-toggle/routing-assignment, or the spatial
kit's station-tile/door/adjacency-link/cord - composed on top of, never
underneath, the same type/spacing scale). Each genre's own `GENRE.md` names
its adapter, its substrate primitives, its gesture words, and its live-gate
proof.

## What stays constant across every genre

What stays constant across every genre is the **Control grammar**
(`bind.md`): `{op, params, gesture}` is the one contract a genre-blind
harness can drive, so the same live gate (`../../testing/live/live-gate.mjs`,
unchanged G0-G6 semantics) proves D1 (control causation) and, run against
further genres over further real backends, D5 (genre-agnosticism - see
`gate.md`) without knowing anything about racks, synths, DAWs, or 3D rooms
itself. genre-select.md only decides *which* substrate and gesture
vocabulary a twin uses; it never changes what makes a control drivable.

## The proof (D5, genre-agnosticism)

Four genres are proven this way today, each a real backend + real live gate
run - `npm run test:live` (+ `:notes:all`) and `npm run test:live:url` for
the rack, `npm run test:live:patch` for the synth, `npm run test:live:daw`
for the DAW, `npm run test:live:room` (+ `npm run test:d6:room`) for the
spatial genre. See each genre's `GENRE.md` for what its example twin proves
specifically (its gesture words, and, for the spatial genre, the D6 lossless
degrade).

## Mode choice

Alongside genre, this stage also settles tool twin, workflow twin, or
governance twin, and live mode (where the target offers a browser-reachable
same-origin transport) versus fixture mode (otherwise) - see `bind.md`'s
transport note and `fixtures.md` for the fixture-mode discipline that follows
from choosing fixture mode here.

## References

- `../../specs/definition-of-done.md` - the D5 form-independence contract this
  heuristic implements.
- `bind.md` - the Control grammar every genre's substrate must emit.
- `gate.md` - D1-D6, including D5 (genre-agnosticism) and D6 (lossless
  degrade, spatial genre only today).
