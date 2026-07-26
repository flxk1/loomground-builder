# room — a small spatial control-room service (the source manual)

A minimal source: a walkable-room-shaped scaffold — a fixed small room (three
stations, two doors) whose station levels can be set, whose doors can be
opened and closed, and whose stations can be linked into an adjacency graph.
Deliberately a plain scaffold (nothing renders 3D on the backend side; it is
state and adjacency, the same category as `notes`/`urlshortener`/`patch`/
`mix`) — the safe-to-generate category. Never an enforcement core.

The point of this source is genre, not domain complexity: it exists to prove
that the twin DoD (`specs/definition-of-done.md`) holds over a mental model
whose natural controls are a walkable 3D room — station dials, door toggles,
and adjacency links, not rack buttons, not knobs/cables, and not a transport
bar/mixer. This is the spatial D5 genre and D6 lossless-degrade witness in
`specs/definition-of-done.md`.

## The room (fixed; no create-station/door op — a real small room, not a
   builder of rooms)

| station | role | level starts at |
|---|---|---|
| `helm` | navigation | 40 |
| `comms` | communications | 65 |
| `power` | reactor | 15 |

| door | starts |
|---|---|
| `north` | closed |
| `east` | closed |

At construction, one adjacency link exists by default: `helm` &rarr; `comms`
(the room's factory adjacency) — a real link, not seed data recorded
separately (there is no create-station op to seed through, so the default
topology is part of the backend's own initial state, honestly labelled as
such in the rationale, not hidden as if it were user-driven history). Same
honest deviation the `patch` (`osc1.out -> filter1.in`) and `mix`
(`t1 -> busA`) backends document.

Links are stored and matched as the exact ordered pair given (`a`, `b`) — the
same "from/to exact match" discipline `patch`'s port connections use, not a
symmetric/undirected adjacency test. Connecting `comms` &rarr; `helm` when
only `helm` &rarr; `comms` exists is a distinct link, not a duplicate.

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `station.setLevel` | write | `station`, `value` | `{ ok, station, level, rev }` or `{ ok: false, error }` if `station` is unknown or `value` is not a number |
| `door.open` | write | `door` | `{ ok, door, open, rev }` or `{ ok: false, error }` if `door` is unknown |
| `door.close` | write | `door` | `{ ok, door, open, rev }` or `{ ok: false, error }` if `door` is unknown |
| `link.connect` | write | `a`, `b` | `{ ok, links, rev }` or `{ ok: false, error }` if either station is unknown, or the pair is already linked |
| `link.disconnect` | write · destructive | `a`, `b` | `{ ok, links, rev }` or `{ ok: false, error }` if no such link exists |
| `room.state` | read | — | `{ ok, rev, stations: { <id>: {level} }, doors: { <id>: {open} }, links: [{a,b}] }` |

`station.setLevel` accepts any station id in the fixed room; calling it
against an unknown station is refused, not coerced. `door.open`/`door.close`
set the door's `open` boolean; calling either when already in that state is a
real idempotent no-op (see Witness below). `link.connect` refuses a pair that
is already linked (no duplicate adjacency); `link.disconnect` refuses a pair
that isn't currently linked.

## Witness — `rev`

`rev` is a monotonic revision counter, part of the real state returned by
`room.state` (not a side-channel invented for the gate): it increments by
exactly 1 on every op that actually changes state — `station.setLevel` only
when the value actually differs from the current one, `door.open`/
`door.close` only when the door's boolean actually flips, `link.connect`/
`link.disconnect` on every successful call (each adds or removes exactly one
adjacency link). It never moves on a refusal, and never on a same-value
`setLevel`/already-open/already-closed no-op — the same state-faithful
discipline as `patch`'s `setFreq`/`setCutoff` and `mix`'s `setGain`/`setPan`/
`play`/`stop` (`testing/backend/sources/patch/backend.mjs`,
`testing/backend/sources/mix/backend.mjs`).

## Provenance

The backend generated from this manual is a scaffold, not a trusted
enforcement point. It declares `generated: true` and names this manual as its
source.
