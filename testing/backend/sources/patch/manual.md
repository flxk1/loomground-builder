# patch — a small modular signal-patch service (the source manual)

A minimal source: a modular-synth-shaped scaffold — a fixed small rack of
modules (two oscillators, one filter) whose parameters can be tuned and whose
ports can be patched together with cables. Deliberately a plain scaffold
(no audio actually renders; it is state and connections, the same category as
`notes`/`urlshortener`) — the safe-to-generate category. Never an enforcement
core.

The point of this source is genre, not domain complexity: it exists to prove
that the twin DoD (`specs/definition-of-done.md`) holds over a mental model
whose natural controls are knobs and patch cables, not rack buttons. This is
the synth D5 witness.

## The rack (fixed; no create/delete-module op — a real small rack, not a
   builder of racks)

| module | kind | parameter |
|---|---|---|
| `osc1` | oscillator | `freq` (Hz), starts at 440 |
| `osc2` | oscillator | `freq` (Hz), starts at 220 |
| `filter1` | filter | `cutoff` (Hz), starts at 1000 |

Each module exposes two ports for patching: `<module>.out` and `<module>.in`
(a module need not use both — an oscillator is only ever patched from its
`.out`, a filter from either). Ports are addressed as plain strings,
`"<module>.<port>"`.

At construction, one connection exists by default: `osc1.out -> filter1.in`
(the instrument's factory patch) — a real connection, not seed data recorded
separately (there is no create-module op to seed through, so the default
topology is part of the backend's own initial state, honestly labelled as
such in the rationale, not hidden as if it were user-driven history).

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `setFreq` | write | `module`, `hz` | `{ ok, module, freq, rev }` or `{ ok: false, error }` if `module` is absent or not an oscillator |
| `setCutoff` | write | `module`, `hz` | `{ ok, module, cutoff, rev }` or `{ ok: false, error }` if `module` is absent or not a filter |
| `connect` | write | `from`, `to` | `{ ok, connections, rev }` or `{ ok: false, error }` if either port's module is unknown |
| `disconnect` | write · destructive | `from`, `to` | `{ ok, connections, rev }` or `{ ok: false, error }` if no such connection exists |
| `list` | read | — | `{ ok, rev, connections: [{from,to}], params: { <module>: { freq | cutoff } } }` |

`setFreq` only accepts oscillator modules (`osc1`, `osc2`); `setCutoff` only
accepts the filter module (`filter1`) — calling either against the wrong kind
of module, or an unknown module id, is refused, not coerced.

## Witness — `rev`

`rev` is a monotonic revision counter, part of the real state returned by
`list` (not a side-channel invented for the gate): it increments by exactly 1
on every op that actually changes a parameter or the connection set
(`setFreq`, `setCutoff`, `connect`, `disconnect`, when each succeeds), and
does not move on a refusal or on `list` itself. This is what the live gate's
`witness()` reads out-of-band.

## Provenance

The backend generated from this manual is a scaffold, not a trusted
enforcement point. It declares `generated: true` and names this manual as its
source.
