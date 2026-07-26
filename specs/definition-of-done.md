# Definition of Done — the twin controls the real backend

A mental twin is **done** when, for a backend that reduces to mental-model
nodes, the generated UI — following the design principles — actually controls
the real APIs: a UI action issues the real call and the real backend state
changes as asserted. This is the backend analogue of how a generated web page
is done only when it actually runs, not when it merely looks right. Rendering
correctly is necessary; it is not done.

The DoD is defined **universally** (target-agnostic properties) and verified
through a thin **per-target adapter** — the pack. The gate logic mentions no
specific tool; the adapter supplies only what the target alone can know. A tool
is done when its twin passes the properties below against its real backend.

## The mental model, universally

Any tool reduces to nodes and state:

- **Node** = one operation, carrying: identity, a purpose note, a **mutation
  class** (`read` · `write` · `destructive`; plus `idempotent`, `open-world` —
  the MCP annotation vocabulary), a typed input surface, and a response shape.
- **State** = what ops read and write; observable out-of-band.

The op catalogue *is* the mental model. The twin is its outside: every node has
a reachable control, reads render their response, writes confirm-gate by
mutation class, destructive ops require typed confirmation.

## The adapter (the pack) — the only target-specific surface

The universal gate needs a target to provide exactly this, nothing more:

```
boot()            -> { baseUrl, auth, teardown() }   start the REAL backend (ephemeral)
catalogue()       -> Node[]                            the mental model (ops, mutation class, schema)
serveTwin(baseUrl)-> url                               the generated twin, served from the backend origin
fixture.create()  -> handle                            a throwaway scope for real writes
fixture.destroy(handle)
witness(handle)   -> value                             an OUT-OF-BAND, monotonic observable of real state
probes            -> { read, write, refuse }           representative nodes to exercise
```

`witness` is the load-bearing hook: a way to observe backend truth **through a
channel the twin never touches** (a direct log/DB/file read), returning
something that advances on a real write. It is what separates "the DOM looked
updated" from "the backend actually changed."

## The universal properties (target-agnostic assertions)

Each property is verified by the gate for every node (or a representative
sample), through the adapter. Each closes a specific false-green trap.

- **G0 · Provenance.** The booted backend is the real target, not a mock — a
  canary/identity op returns the real implementation's signature before any
  test runs. *Defeats: a stray mock on the same port silently satisfying the
  gate.*
- **G1 · Reachability + schema.** Every catalogue node has a twin control;
  driving it emits a request matching the node's declared op/params schema.
  *Defeats: coverage gaps and hand-waved controls.*
- **G2 · Read causation.** Driving a read control makes the twin display data
  that **matches an out-of-band read** of the same state — not "the DOM
  changed," but "the DOM reflects real backend truth." *Defeats: optimistic
  local rendering.*
- **G3 · Write causation.** Driving a write changes real state, verified by the
  witness before/after (it must advance). *Defeats: a read that looks like a
  write.*
- **G4 · Stub-defeat.** Two different write payloads produce two **different**
  witness values, and the witness is monotonic (a counter/version/log tip),
  not a canned literal. *Defeats: a handler stub that returns success and
  persists nothing.*
- **G5 · Honesty on failure.** When the backend refuses or errors (drive a call
  it must reject), the twin shows failure, not success. *Defeats: the UI firing
  the call but ignoring the response.*
- **G6 · Mutation-safety, live.** Destructive ops run for real but **only against
  fixtures the gate created**, never pre-existing data; and the twin's
  confirm-gating matches the declared mutation class live — a destructive op
  does not fire without the typed confirm. *Keeps a real-write gate safe and
  ties the structural gate to live behaviour.*

## The three layers

- **L1 · Structure** (exists: `skill/sheet/gate.mjs`, jsdom, no backend) — the
  twin has the right controls and gates destructive actions. Fast pre-check.
- **L2 · Live — the DoD** (this document) — G0–G6 against the real backend via
  the adapter. Real browser or jsdom + real loopback server; the engine is not
  what matters, the out-of-band witness is.
- **L3 · Visual loop** (SKILL.md) — render → screenshot → critique.

L1 without L2 is a twin that looks right and does nothing. L2 is the line that
makes "controls the real APIs" a checkable claim rather than a hope.

## What stays out of the DoD gate

- **Record/replay** (Polly/VCR/nock): passes even when today's live path is
  broken — a fast downstream smoke test only, never the DoD.
- **Contract-only** (Pact-style schema verification): valuable as a *second*
  layer for catching catalogue/backend drift, but it never touches the twin's
  DOM, so it cannot stand in for L2.
- **A global dry-run switch:** would defeat the entire "controls the real
  backend" claim. Safety comes from ephemeral fixtures per mutation class, not
  from turning writes off.

## The in-repo reference adapter — notes

**Status: implemented and green for the `notes` adapter** (`npm run test:live`,
the live gate's default target, 7/7): G0 provenance (a served generated
scaffold), G1 reachability, G3 write causation (a twin-driven `notes.add` grows
the live entry count), G6 confirm-gating, G4 stub-defeat (a second distinct
write), G5 honesty-on-failure (a refused read shows in the twin, count
unchanged). The `urlshortener` adapter (`npm run test:live:url`) adds G6b — a
destructive `remove` driven through the typed-name confirm gate. The harness
(`testing/live/live-gate.mjs`) is target-agnostic; target specifics live in
`testing/live/adapters/`.

`notes` is a neutral in-repo scaffold — no external plane needed — which is why
it is the default proving ground: its bridge serves the generated backend
same-origin, and `witness` reads the live entry count out-of-band, a monotonic
truth signal a stub cannot forge. RVND is the first real-PLANE case: it consumes
this skill and lives in loomground-patchbay (rvnd-design/), where its adapter
boots a real `serve.py` and its witness is the append-only signed audit chain.
