# meta — meta-language core + Versum ingest round-trip (M1–M4, M7 seam)

`(surface, tier) → {NDSystem, SemanticMapping, SystemAdapter}`, generated
against Versum's *real* contracts. M4 lowers the generated projection into
Ingest's real `Subgraph`, writes it with Versum's graph persistence APIs, and
reads it back with Versum's loaders. M5 then sends the persisted neutral edge
representation through Solver. Render/twin wiring and plugin packaging remain
outside this module. The general `loomground-ingest.versum_writer()`
seam remains untouched and fail-closed; this repo owns only its generated
surface tool path.

## Layout

```
meta/
  surface.py     the input format: Surface/Op/Param/Relation dataclasses
                 (stdlib only, no versum import — usable before venv setup)
  policy.py      the depth-tier policy: pure functions of (surface, tier) ->
                 axis dicts / relation-dimension coverage / version hash
  adapter.py     MetaAdapter (implements versum.adapters.protocol.SystemAdapter)
                 + generate(surface, tier) -> GeneratedLanguage
  ingest.py      GraphProjection -> Ingest Subgraph; PolicyError -> quarantine
  store.py       scoped writer/read lens over Versum concepts + semantic edges
  gate.py        the M1-M3 DoD gate (run with `python -m meta.gate`)
  gate_m4.py     M4 round-trip + teeth and M7 fail-closed gate
  surfaces/
    notes.json   CRUD surface, zero declared inter-op relations (contrast case)
    patch.json   connections-shaped surface (feeds/precedes/sibling relations)
```

## Running the gate reproducibly

Needs Python >=3.10 and the immutable dependencies declared in
`requirements-dev.txt`.

```bash
cd loomground-builder
python3 -m venv .venv-meta
.venv-meta/bin/pip install -r requirements-dev.txt
.venv-meta/bin/python -m meta.gate
.venv-meta/bin/python -m meta.gate_m4
.venv-meta/bin/python -m meta.gate_m5
.venv-meta/bin/python -m meta.gate_m6
.venv-meta/bin/python -m meta.gate_m7
```

`.venv-meta/` is gitignored and disposable. Release commands use `python3`
from the active environment, so no gate depends on this machine-local path.

Expect `GATE PASS (80 assertions)`.

The M4 gate writes every `(surface × tier)` to a fresh temporary Versum-format
store (`.versum/concepts.csv`, `.versum/semantic_edges.csv`,
`.versum/nd/assignments.csv`, nD system manifests, and provenance),
reads it back through `versum.store.graph`, and compares the full graph. Its
teeth checks independently delete an edge and corrupt a dimension in the stored
CSV and require the read-back comparison to reject both. It also proves an
unsupported fine-detail parameter type is quarantined and creates no store.

## The surface format

A surface is `{object_type, ops: [...]}`. Each op is:

```json
{
  "facade": "notes",
  "name": "add",
  "mutates": "write",
  "params": [{"name": "text", "type": "string", "cardinality": "one", "vocabulary": []}],
  "relations": [{"to": "list", "kind": "feeds"}]
}
```

- `mutates` is closed: `read | write | destructive`.
- `param.type` must be one of Versum's own `AxisSpec` value types (checked at
  generate-time; an unsupported type raises `PolicyError` before an `NDSystem`
  is ever built — fail closed, matching the spec's M7 discipline even though
  M7 itself is out of scope for this loop).
- `relations[].kind` is closed: `feeds | precedes | grants | sibling`, each
  fixed to exactly one Federation-5D dimension (`causal | temporal |
  intentional | relational` respectively). Structural membership (op→facade)
  is derived by the generator, never declared by the surface.

Two test surfaces, both derived from `testing/backend/sources/{notes,patch}/manual.md`
(no invented ops):

- **notes** — plain CRUD (`add/list/get/done/remove`). Declares **zero**
  inter-op relations: the manual only states informal data-flow ("after
  `add`, `list` contains…"), never an explicit ordering/authorization/grouping
  contract, so none is invented.
- **patch** — a connections-shaped rack (`setFreq/setCutoff/connect/disconnect/list`).
  Declares `feeds` (every mutator feeds `list`), `precedes` (`connect`
  precedes `disconnect` — the manual: disconnect errors "if no such
  connection exists"), and `sibling` (`setFreq`/`setCutoff` are sibling
  parameter-tuning ops). No `grants` — the manual has no
  authorization/permission semantics to project onto `intentional`, and none
  is invented.

## The tier policy (as implemented)

| | coarse | normal | fine |
|---|---|---|---|
| `op_facade` axis | yes | yes | yes |
| `mutation_class` axis | yes (nominal, `equal` only) | yes (refined: `contains`/`contained_by` primitives + an ontology fact `destructive contains write`, stated only when the surface has both classes) | yes |
| `op_param` axis (param-of-op membership) | — | yes, iff the surface has any params | yes |
| `param_value_type` / `param_cardinality` axes | — | — | yes, iff the surface has any params |
| `param_vocabulary` axis | — | — | yes, iff at least one param declares a vocabulary |
| relations projected | `member_of_facade` → structural | + `feeds` → causal (iff declared) | + `precedes` → temporal, `grants` → intentional, `sibling` → relational (each iff declared) |

Node/facade existence is tier-independent; what varies by tier is which
axes/relations are asserted about them — this is what keeps refinement a
strict "finer adds, never restructures."

## Per-(surface × tier) M1/M2/M3 results

All 8×(M1×4 + M2×3) + refinement/honesty/determinism assertions pass; run
`.venv-meta/bin/python -m meta.gate` for the exact `ok` lines. Summary:

| surface/tier | axes | relations | dimensions used | NDSystem version |
|---|---|---|---|---|
| notes/coarse | 2 | 5 (member_of_facade only) | structural | `coarse-0ede6e8457d6` |
| notes/normal | 3 | 5 | structural | `normal-1934e8e11086` |
| notes/fine | 5 | 5 | structural | `fine-2211713133bb` |
| patch/coarse | 2 | 5 | structural | `coarse-5643f00fcbc4` |
| patch/normal | 3 | 9 (+4 feeds) | structural, causal | `normal-a3b6a43114b8` |
| patch/fine | 6 | 11 (+1 precedes, +1 sibling) | structural, causal, temporal, relational | `fine-ea6ecddabb41` |

`GATE PASS (80 assertions)`.

## Honesty evidence

- `notes/fine` has **5** axes, no `param_vocabulary` — no param in `notes.json`
  declares a closed vocabulary, so the axis is correctly omitted.
- `patch/fine` has **6** axes, including `param_vocabulary` — `setFreq.module`,
  `setCutoff.module`, `connect.from/to`, `disconnect.from/to` all declare one,
  so the axis is correctly present.
- `notes` never projects a `causal`/`temporal`/`intentional`/`relational`
  relation at *any* tier — it declares zero inter-op relations, so only the
  always-on `structural` membership edge appears, at every tier.
- `patch` never projects `intentional` at any tier — the surface never
  declares a `grants` relation (no authorization semantics in the manual), so
  the mapping/dimension is never invented even though the vocabulary
  (`RELATION_KIND_DIMENSION`) knows about it.

## Determinism

- Same `(surface, tier)`, called twice → identical `NDSystem.version` and
  `SemanticMapping.version` (verified for all 6 surface×tier combinations).
- Same tier, different surface → different version (verified for all 3
  tiers: `notes` vs `patch` hashes never collide).
- Versioning mirrors `versum/integrations/loomground/adapter.py`'s ladder-hash
  pattern: `f"{tier}-{sha256(json({"object_type","tier","surface":surface.canonical()}))[:12]}"`.
