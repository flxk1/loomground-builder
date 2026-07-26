# urlshortener — a small tool (the source manual)

A third reference source for the backend gate, chosen to be structurally
unlike the first two: `notes` is plain CRUD and `inventory` is numeric state
with a refusing write; `urlshortener` adds a **lookup-by-derived-key** shape —
a write mints an opaque code, and every read after that hinges on whether the
code still resolves. Two of its stated behaviours are refusal/absent cases:
resolving an unknown code, and resolving a code after it has been removed. A
plain scaffold, never an enforcement core.

## Operations

| op | mutation class | params | returns |
|---|---|---|---|
| `shorten` | write | `url` | `{ ok, code, url }` |
| `resolve` | read | `code` | `{ ok, url }`, or `{ ok: false, error }` if the code is unknown |
| `list` | read | — | `{ ok, entries: [{ code, url }] }` |
| `remove` | write · destructive | `code` | `{ ok }`, or `{ ok: false, error }` if the code is unknown |

## Stated behaviours (the conformance vectors)

1. After `shorten(url)`, `resolve(code)` returns that same `url`.
2. After `shorten(url)`, `list` contains an entry for that `code` and `url`.
3. `resolve` on a code that was never shortened is **refused** (`ok: false`) —
   the absent-key case.
4. After `shorten` then `remove(code)`, `resolve(code)` is refused
   (`ok: false`) — a removed code does not resolve.
5. `resolve` and `list` are reads: calling them does not change what `list`
   returns. `shorten` and `remove` are writes: they do.

## Provenance

The backend generated from this manual declares `generated: true` and names
this manual as its source. It is a scaffold, not a trusted enforcement point.
