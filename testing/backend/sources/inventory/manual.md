# inventory — a small tool (the source manual)

A second reference source for the backend gate, deliberately unlike `notes`:
numeric state, a write that **refuses** when stock is insufficient, and a
witness that is a sum rather than a count. Its only job is to prove the backend
gate is source-agnostic — the same harness gates it with no changes. A plain
scaffold, never an enforcement core.

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `stock` | write | `item`, `qty` | `{ ok, item, level }` |
| `take` | write | `item`, `qty` | `{ ok, item, level }`, or `{ ok: false, error }` if the level is below `qty` |
| `level` | read | `item` | `{ ok, item, level }`, or `{ ok: false, error }` if the item is unknown |
| `items` | read | — | `{ ok, items: [{ item, level }] }` |
| `discard` | write · destructive | `item` | `{ ok }`, or `{ ok: false, error }` if the item is unknown |

## Stated behaviours (the conformance vectors)

1. After `stock("apples", 10)`, `level("apples")` is 10.
2. After `stock("apples", 10)` then `take("apples", 3)`, `level("apples")` is 7.
3. `take` beyond the level is **refused** (`ok: false`) and leaves the level
   unchanged — a write the backend legitimately declines.
4. After `discard(item)`, `level(item)` reports the item unknown (`ok: false`).
5. `level` and `items` are reads: calling them does not change what `items`
   returns. `stock`, `take`, and `discard` are writes: they do.

## Provenance

The backend generated from this manual declares `generated: true` and names
this manual as its source. It is a scaffold, not a trusted enforcement point.
