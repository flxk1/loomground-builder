# Backend from model — the inverse generation

Status: **draft — awaiting decision**. Companion to
[`definition-of-done.md`](definition-of-done.md). This spec opens the second
axis: if a twin UI can be generated *from* a backend's mental model, the same
model can generate *a backend* from manuals, descriptions, and research. It
defines what that means, what "done" is when there is no prior backend to check
against, and where the line is that must not be crossed.

## The model is bidirectional

The mental model is the spine, and both a backend and a UI are projections of
it:

```
manual / description / research  ──►  mental-model nodes  ──►  ┬─►  backend implementation
                                      (ops · state · contracts) └─►  twin UI
```

Today the designer runs the right half only: a real backend's op surface →
a twin UI, proven by the live gate. The inverse — sources → the node model →
a backend — is the same move a page generator makes going spec → working site,
and the same inside/outside framing closed into a full circle: the backend is
the inside, the twin its outside, both authored from one model.

## Why the DoD flips

For a twin, ground truth is the **live backend**: the twin is done when it
drives the real API. For a *generated* backend there is no prior backend to
drive — you are creating the thing that would be the ground truth. So "done"
cannot mean "matches the backend." It means, in order:

1. **Surface conformance.** The backend actually exposes the op surface the
   model declared — every node reachable, with its declared params and mutation
   class. This is the mirror of the twin's completeness rule: every modelled op
   is a real, callable op, or the gap is named. Never a stub that only appears
   in the catalogue.
2. **Behavioural conformance to the sources.** The manual's stated
   behaviours — its examples, its scenarios, its "given X, calling Y yields Z" —
   become **conformance vectors**: run each against the generated backend and
   assert the stated outcome. The sources are the ground truth the manual
   already wrote down; generation does not get to reinterpret them.
3. **Self-consistency (the backend's own witness).** A write is observable by
   its paired read: after a generated write op runs, a generated read op
   reflects it. This is the same out-of-band-witness idea turned inward — the
   backend must be internally causal, not a set of ops that each fake success.

A backend that passes 1–3 is *done* in the sense this repo can check. It is not
thereby *correct beyond the manual*: anything the sources did not state is
unverified, and must be labelled so — the requisite-variety honesty rule again
(what the model covers; what it hands back to a person).

## The gate composes with the twin gate

The two gates chain, and together they close the loop end to end:

```
sources ─► generate backend ─► [backend gate: surface + behaviour + self-consistency]
        └─────────────────────► generate twin from that backend's surface
                                 └─► [live DoD gate: the twin drives the generated backend]
```

The live Definition-of-Done gate already built is exactly the instrument that
tells you whether a generated backend actually *behaves* rather than merely
compiles: point the twin at the generated backend and the same G0–G6 apply.
Provenance (G0) gains a second meaning here — the backend under test is the
*generated* one, labelled as generated, not silently swapped for a real system.

## The line that must not be crossed

A generated backend is a scaffold, a mock target, or a new plane's skeleton —
never a trusted enforcement core. Concretely:

- **Safe to generate:** a throwaway backend to develop and gate a twin against;
  a mock of a described API for offline work; the CRUD-and-read skeleton of a
  new plane, to be reviewed and hardened by a person.
- **Never generated:** an enforcement point — a privacy lock, a fail-closed
  egress boundary, a signed audit chain, anything whose job is to *withhold*.
  You cannot synthesise "refuses correctly under attack" from a manual and
  trust it. This is the same line the topology already draws: the lock never
  extracts and never vendors; here, it never generates either.

## The provenance-stamp contract (shipped backends)

A shipped generated backend MUST carry a provenance stamp — the backend
analogue of the twin's "design-unverified" header. The stamp is a flat object
with these required fields:

| field | rule |
|---|---|
| `generated` | must be `true` |
| `source` | the manual/description it was generated from |
| `generator` | what generated it |
| `class` | `"scaffold"` or `"mock"` — the safe categories; `"enforcement"` is not a legal value |
| `enforcement_point` | must be `false` — a generated backend is never a trusted enforcement point |
| `notice` | a plainly-worded human line saying so |

The stamp travels two ways, both required: **at runtime** through a stable
accessor (`info()`), and **as a shipped artifact** (`provenance.json` beside the
backend) so the label is visible without running it.

The gate enforces it **fail-closed**: **B0** rejects any backend that omits a
required field, uses a `class` outside `{scaffold, mock}`, or sets
`enforcement_point` to anything but `false` (so a backend cannot claim to be
trusted enforcement); **B0b** rejects a shipped `provenance.json` that does not
match the runtime stamp. A backend that fails either exits non-zero — it cannot
ship. This is the mechanised form of "never generate an enforcement core": even
if someone generates one and labels it enforcement, the gate refuses it, and a
scaffold that quietly drops its stamp refuses too.

## Completeness and chunking

The same discipline as the twin: every modelled op is generated or named (no
silent drop), and a large surface is generated and gated in **chunks** (by
facade/domain), reporting progress. A conformance vector that cannot be run is
recorded, never quietly passed.

## Non-goals

- No generation of enforcement cores, ever (above).
- No reinterpretation of the sources: the manual's stated behaviour is the
  spec, not a starting point for invention.
- No claim of correctness beyond what the sources state; the unverified residual
  is labelled, not hidden.
- No new runtime: a generated backend is ordinary code a person can read,
  review, and harden — not a black box.

## Status: implemented (reference sources, procedure documented)

`npm run test:backend` (notes) / `test:backend:url` (urlshortener) /
`test:backend:all` (all three, chained) — the backend gate, a target-agnostic
harness (`testing/backend/backend-gate.mjs`) with per-source adapters
(`testing/backend/adapters/`), mirroring the live gate. The procedure that
turns a manual into a gate-passing backend is written up at
[`../skill/generate-backend.md`](../skill/generate-backend.md).
Properties per source: B0 provenance stamp (the full shipped-backend stamp,
fail-closed — see below), B0b the shipped `provenance.json` matches the runtime
stamp, B1 surface conformance (every declared op implemented), B1b
mutation-class conformance (declared reads don't mutate, writes do), B2
behavioural conformance (the manual's vectors hold, as data — see below), B3
self-consistency (a write is observable by a read). Verified to have teeth: a
backend whose op silently no-ops fails B1b and B2; one that claims to be an
enforcement point, omits stamp fields, or ships a mismatched stamp fails B0/B0b
(exit non-zero).

**Conformance vectors are data, not code.** Each source's stated behaviours
live in a `vectors.json` (given/when/then): `steps` (setup calls, `bind`-ing
results), `when` (the action), `then` (assertions on its response — `equals`
or `contains`), and optional `check` follow-up reads; `$name.path` references a
bound result. A shared runner (`testing/backend/vector-runner.mjs`) interprets
them and runs them **chunked by `domain`**, reporting per-chunk progress and
naming every failure — so a large manual scales and never silently caps. A
source may still supply code vectors as a fallback.

**Four reference sources gated by the same unchanged harness**, which is the
proof it is source-agnostic:
- `notes` (`sources/notes/`) — a CRUD-shaped store; witness = list length.
  Green 6/6.
- `inventory` (`sources/inventory/`) — numeric state, a `take` that **refuses**
  when stock is insufficient (a write the backend legitimately declines),
  witness = total units. Green 6/6, including the refusal vector.
- `urlshortener` (`sources/urlshortener/`) — a write mints an opaque key
  (`shorten` → `code`) that a read (`resolve`) hinges on; two stated
  refusal/absent vectors (an unknown code, and a code after `remove`),
  witness = live entry count. Green 6/6, including both refusal vectors.
- `jobqueue` (`sources/jobqueue/`) — a FIFO queue: `dequeue` is a write whose
  *effect* (removal + order) the behavioural vector must verify, not just its
  return value, and the manual declares no full-state read; witness = size.
  Green 6/6. Generated in the cold test that exercised the written procedure
  end to end, and the source that drove the vector-strength and
  no-full-state-read guidance now in `generate-backend.md`.
Adding each source required no change to `backend-gate.mjs`; only its adapter
differs. All carry their behaviours as `vectors.json` data, run chunked by
domain.

## Open decisions

All initial open decisions are resolved: the reference sources, the
fail-closed provenance-stamp contract, the data-driven chunked vector format,
and the generator procedure itself (`skill/generate-backend.md`) are built and
green. Remaining work is additive — more sources, and carrying vectors inline
in the manual (markdown-embedded) rather than a sibling `vectors.json` —
neither blocking.
