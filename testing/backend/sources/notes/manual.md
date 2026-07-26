# notes — a small tool (the source manual)

A minimal source, used as the reference case for the backend gate: a backend is
generated from this manual, and the gate proves the generated backend conforms
to it. Deliberately a plain scaffold (a notes store) — the safe-to-generate
category. Never an enforcement core.

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `add` | write | `text` | `{ ok, id }` |
| `list` | read | — | `{ ok, notes: [{ id, text, done }] }` |
| `get` | read | `id` | `{ ok, note }` or `{ ok: false, error }` if absent |
| `done` | write | `id` | `{ ok, id }` |
| `remove` | write · destructive | `id` | `{ ok }` or `{ ok: false, error }` if absent |

## Stated behaviours (the conformance vectors)

1. After `add("buy milk")`, `list` contains a note whose text is "buy milk".
2. After `add` then `done(id)`, `get(id)` reports the note `done`.
3. After `remove(id)`, `get(id)` reports absent (`ok: false`).
4. `list` and `get` are reads: calling them does not change what `list` returns.
   `add`, `done`, and `remove` are writes: they do.

## Provenance

The backend generated from this manual is a scaffold, not a trusted enforcement
point. It declares `generated: true` and names this manual as its source.
