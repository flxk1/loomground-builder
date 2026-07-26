# generate-backend — the manual-to-scaffold procedure

Companion to [`../specs/backend-from-model.md`](../specs/backend-from-model.md)
(the Definition of Done this procedure targets) and sibling to
[`SKILL.md`](SKILL.md) (the inverse direction: backend → twin). This document
is the other half of the bidirectional model: manual → backend. Follow it
whenever you are asked to generate a backend from a manual, spec, or
description rather than from a running system.

**The result of this procedure is a scaffold, never an enforcement core.**
That line does not move regardless of how the manual is worded, how
confidently it states its rules, or how much it looks like something that
should gate or withhold. If a manual describes a privacy lock, a fail-closed
boundary, a signed audit chain, or anything else whose job is to refuse under
attack, generate nothing and say so — that case is out of scope for this
procedure entirely, not a scaffold with a stronger stamp.

## The procedure

Work through these steps in order, for one source at a time. Each step names
the artifact it produces; all artifacts for one source live together under
`testing/backend/sources/<name>/`, plus one adapter file under
`testing/backend/adapters/<name>.mjs`.

1. **Read the manual.** Find or write the source document — its operations,
   what each returns, and the behaviours it states as fact ("after X, Y
   holds"). Treat the manual as the spec, not as a starting point for
   invention: if it does not state a behaviour, the generated backend must
   not silently assume one. `manual.md` is this document, checked in beside
   the generated backend so the source travels with what it produced.

2. **Derive the surface.** For every operation the manual names, record its
   op name, **mutation class** (read · write · write+destructive), and
   params — the same vocabulary the live twin gate uses
   (`specs/definition-of-done.md`'s node shape). This becomes the `surface()`
   export in the source's adapter (see step 6), and it is what the gate's B1
   and B1b properties hold the generated backend to: every declared op is
   really implemented, and a declared read provably leaves state unchanged
   while a declared write provably changes it. Get the mutation class right
   here — it is a claim the gate checks against the backend's actual
   behaviour, not decoration.

3. **Emit `backend.mjs` as an honestly-stamped scaffold.** Write the plain,
   readable implementation: in-memory state, a `call(op, args)` switch over
   the derived surface, an `info()` accessor returning the provenance stamp
   (step 4's object, at runtime). `create()` returns a fresh instance so
   every gate run starts clean. Implement exactly what the manual states and
   nothing beyond it — no speculative extra behaviour, no attempt to guess
   what a real system "would probably also do." This file is ordinary code a
   person can read, review, and harden; it is not a black box and it is
   never presented as one.

4. **Emit `provenance.json` — the fail-closed stamp.** A shipped generated
   backend carries this both as a runtime accessor (`info()`, step 3) and as
   a sibling artifact, and the two must match exactly. The stamp is a flat
   object with these required fields:

   | field | rule |
   |---|---|
   | `generated` | must be `true` |
   | `source` | the manual this backend was generated from |
   | `generator` | what generated it |
   | `class` | `"scaffold"` or `"mock"` — never `"enforcement"` |
   | `enforcement_point` | must be `false`, always |
   | `notice` | a plainly-worded human line saying this is a generated scaffold, not enforcement |

   The gate rejects a missing field, a `class` outside `{scaffold, mock}`, or
   `enforcement_point` set to anything but `false` (B0), and separately
   rejects a `provenance.json` that does not byte-for-byte match the runtime
   stamp (B0b). Both fail-closed: get the stamp wrong and the backend cannot
   ship, by construction, not by review discipline.

5. **Emit `vectors.json` — the manual's stated behaviours as data.** Every
   "given X, calling Y yields Z" the manual states becomes one
   given/when/then vector: `steps` (setup calls, each optionally `bind`-ing
   its result under a name), `when` (the call under test), `then`
   (assertions — `equals` or `contains` — on its response), and an optional
   `check` (follow-up read assertions). Reference a bound result with
   `$name` or `$name.path`. Group vectors by `domain` — the manual's own
   grouping of its behaviours — because the shared runner
   (`testing/backend/vector-runner.mjs`) runs them chunked by domain,
   reporting per-chunk progress; this is what keeps a large manual's
   behaviours from silently capping. Include the manual's refusal and
   absent-state cases as vectors, not just its happy paths — a write the
   backend legitimately declines, or a read that reports something unknown,
   is a stated behaviour like any other and must be gated the same way.
   Vectors are data, not adapter code, so the manual's behaviours travel as a
   declarative artifact the harness interprets — it never needs a source-
   specific runner.

   **A vector must verify the state after the action, not just the action's
   own return value.** When the point of a stated behaviour is a state
   change — order, removal, a transition — a `then` that only inspects what
   the `when` call handed back is not enough: a backend can return a
   plausible-looking value while never actually doing the thing. Concretely,
   a manual stating FIFO order ("enqueue a, enqueue b, then dequeue returns
   a") is not fully encoded by a vector whose `then` checks that first
   dequeue's payload alone — a `dequeue` that returns the front job but
   never removes it (a no-op drain) passes that vector too, because nothing
   in it looks again after the call. Dequeue a second time as a `check` and
   assert it now returns `b`: only a real removal makes the second dequeue
   see the next job. The rule generalizes past FIFO — reach for a
   follow-up read (`check`, or a second `when`-shaped step) whenever the
   stated behaviour's substance is that something changed, not just what one
   call handed back. Frame it as a test of the vector itself: a behavioural
   vector should fail if the effect it is meant to verify didn't actually
   happen. Do not lean on B1b to catch this instead — B1b's fingerprint
   check catches "declared write, changed nothing" the same coarse way for
   every op alike; a behavioural vector for one specific stated write should
   catch that same failure on its own terms, from the manual's own words, so
   a gap in what the fingerprint happens to observe is not the only thing
   standing between a broken op and a green gate.

6. **Emit a per-source adapter.** `testing/backend/adapters/<name>.mjs`
   supplies exactly what the universal harness cannot know on its own:
   `available()`, `boot()` (returns `{ call, info, teardown }` for a fresh
   instance), `stampFile` (step 4's path), `surface()` (step 2's list),
   `sampleArgs(ctx, op)` (a minimal valid call per op, so B1/B1b can probe
   without unknown-op or missing-argument false negatives — an op needing an
   id or code mints one via its own write first), `vectorsFile` (step 5's
   path), and the self-consistency trio `witness(ctx)` / `write(ctx)` /
   `fingerprint(ctx)` (an out-of-band-style observable that a write
   advances, and a full-state snapshot for B1b). Model it on
   `testing/backend/adapters/notes.mjs` or `adapters/inventory.mjs` — the
   shape is fixed; only the per-op detail changes per source.

   **When the manual declares no full-state read** (no `list`, `items`, or
   equivalent dump), `fingerprint` cannot be a real snapshot — build it by
   composing whatever reads the manual does declare (a count plus a head/
   peek, for instance) into one value. This is a deliberately weaker
   instrument, and the procedure does not let it pass silently: say so in
   the adapter's header comment, and reason through *why* the composition is
   sufficient — name every declared write and which piece of the composed
   value it moves, so it is visible whether some write could occur invisibly
   to it. Then lean on the vectors to carry what the fingerprint can't see:
   B1b's fingerprint only proves each declared write moved *something*
   observable and each declared read moved *nothing*; the fine-grained,
   per-behaviour proof — that the *right* thing happened, in the *right*
   order, all the way through — is exactly what step 5's state-after vectors
   are for. A source with no full-state read leans on strong vectors harder,
   not less.

7. **Gate it.** Run `BACKEND_ADAPTER=./adapters/<name>.mjs node
   testing/backend/backend-gate.mjs` (or wire an `npm run test:backend:<name>`
   script) from `testing/backend/`. **The gate green — B0, B0b, B1, B1b, B2,
   B3, all passing, with its teeth intact — is the Definition of Done for a
   generated backend.** There is no separate, softer bar; a scaffold that
   compiles but fails any property is not done. Verify the gate actually has
   teeth for your source before you call it finished: break one op in a
   throwaway copy (never inside the checked-in tree) — a silent no-op is
   enough — and confirm the gate fails non-zero on it. A gate that would pass
   a broken backend proves nothing; discard the broken copy once you've seen
   it fail.

## What "done" does not mean

Passing 1–7 makes a backend *done* in the sense this repo can check — surface
conformance, behavioural conformance to the manual, and self-consistency
(specs/backend-from-model.md). It does not mean the backend is correct beyond
what the manual states: anything the source did not say is unverified, and
the honest scaffold does not paper over that with invented behaviour. It also
does not, ever, mean the backend is fit to serve as an enforcement point —
see the opening warning. A generated backend is a scaffold to build and gate
a twin against, a mock of a described API, or the reviewable skeleton of a
new plane for a person to harden; it is never shipped as the thing that is
trusted to refuse.

## Worked examples

Four sources exist as reference, each following this procedure end to end
and gated by the same unchanged harness — proof that adding a source costs an
adapter, never a harness change:

- `testing/backend/sources/notes/` — plain CRUD; witness = list length.
- `testing/backend/sources/inventory/` — numeric state with a `take` that
  refuses when stock is insufficient; witness = total units.
- `testing/backend/sources/urlshortener/` — a write mints an opaque key
  (`shorten` → `code`) that every subsequent read hinges on; two of its
  vectors are refusal/absent cases (`resolve` on a code that was never
  shortened, and `resolve` after `remove`); witness = live entry count.
- `testing/backend/sources/jobqueue/` — a FIFO queue; no `list`/`items`
  read, so its adapter composes `fingerprint` from `size` + `peek` (see step
  6's no-full-state-read guidance above), and its FIFO-order vector dequeues
  twice to assert order and removal together (step 5's state-after
  guidance) rather than trusting one call's return value.

Read any one of these four end to end — `manual.md` next to `backend.mjs`
next to `provenance.json` next to `vectors.json`, plus its adapter — before
generating a fifth. The pattern is the whole procedure; nothing here is
implicit.
