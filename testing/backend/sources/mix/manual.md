# mix — a small in-memory mixer/transport service (the source manual)

A minimal source: a DAW-shaped scaffold — a fixed small mixer (three tracks,
two buses) plus a transport, whose faders/pans/mutes can be set and whose
tracks can be routed onto buses. Deliberately a plain scaffold (nothing
renders audio; it is state and routing assignments, the same category as
`notes`/`urlshortener`/`patch`) — the safe-to-generate category. Never an
enforcement core.

The point of this source is genre, not domain complexity: it exists to prove
that the twin DoD (`specs/definition-of-done.md`) holds over a mental model
whose natural controls are a transport bar, track strips (fader/pan/mute), and
a bus-routing assignment — not rack buttons and not knobs/cables. This is the
DAW D5 witness in `specs/definition-of-done.md`.

## The mixer (fixed; no create-track/create-bus op — a real small mixer, not a
   builder of mixers)

| track | name | starts at |
|---|---|---|
| `t1` | Kick | gain 0 dB, pan 0, unmuted |
| `t2` | Bass | gain 0 dB, pan 0, unmuted |
| `t3` | Lead | gain 0 dB, pan 0, unmuted |

| bus | name |
|---|---|
| `busA` | Main |
| `busB` | FX |

At construction, one route exists by default: `t1 -> busA` (the instrument's
factory routing) — a real assignment, not seed data recorded separately
(there is no create-track op to seed through, so the default routing is part
of the backend's own initial state, honestly labelled as such, not hidden as
if it were user-driven history). The transport starts stopped
(`playing: false`).

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `play` | write | — | `{ ok, playing, rev }` |
| `stop` | write | — | `{ ok, playing, rev }` |
| `setGain` | write | `track`, `db` | `{ ok, track, gainDb, rev }` or `{ ok: false, error }` if `track` is unknown or `db` is not a number |
| `setPan` | write | `track`, `pos` | `{ ok, track, pan, rev }` or `{ ok: false, error }` if `track` is unknown or `pos` is not a number |
| `mute` | write | `track` | `{ ok, track, mute, rev }` or `{ ok: false, error }` if `track` is unknown |
| `route` | write | `track`, `bus` | `{ ok, routes, rev }` or `{ ok: false, error }` if `track`/`bus` is unknown, or the pair is already routed |
| `unroute` | write · destructive | `track`, `bus` | `{ ok, routes, rev }` or `{ ok: false, error }` if no such route exists |
| `state` | read | — | `{ ok, rev, playing, tracks: { <id>: {name,gainDb,pan,mute} }, buses: { <id>: {name} }, routes: [{track,bus}] }` |

`play`/`stop` set the transport's `playing` boolean; calling either when
already in that state is a real idempotent no-op (see Witness below).
`setGain`/`setPan` accept any track id in the fixed mixer; calling either
against an unknown track is refused, not coerced. `mute` toggles — there is no
"set mute to X", only "flip it" — so every successful call is a real state
change. `route` refuses a pair that is already routed (no duplicate
assignments); `unroute` refuses a pair that isn't currently routed.

## Witness — `rev`

`rev` is a monotonic revision counter, part of the real state returned by
`state` (not a side-channel invented for the gate): it increments by exactly 1
on every op that actually changes state — `play`/`stop` only when the
transport's boolean actually flips, `setGain`/`setPan` only when the value
actually differs from the current one, `mute` on every successful call (it
always flips), `route`/`unroute` on every successful call (each removes or
adds exactly one assignment). It never moves on a refusal, and never on a
same-value `setGain`/`setPan`/`play`/`stop` no-op — the same state-faithful
discipline as `patch`'s `setFreq`/`setCutoff` (`testing/backend/sources/patch/
backend.mjs`).

## Provenance

The backend generated from this manual is a scaffold, not a trusted
enforcement point. It declares `generated: true` and names this manual as its
source.
