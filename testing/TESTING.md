# Testing the mental-twin skill

## Running the gate

The structural gate is self-contained. From the repo root:

```
npm install     # fetches jsdom (pinned in package.json; node_modules is git-ignored)
npm test        # runs skill/sheet/gate.mjs — the twin-sheet/1 contract, 23 assertions
```

`npm test` exits non-zero on any failed assertion. This gate covers structure
and gating behaviour in jsdom only.

The live gate — the Definition of Done (`specs/definition-of-done.md`) — proves
the twin actually controls the real backend:

```
npm run test:live      # boots a real backend via the adapter, drives the twin
                       # through its own DOM, asserts real state changed (G0..G6)
npm run test:live:all  # + completeness: every catalogued op has a control, and
                       # every facade's live read path is exercised, chunked by
                       # facade; any op it cannot drive is named, never skipped
```

It runs through a per-target adapter (`testing/live/adapters/`) and **skips
cleanly (exit 0) when no target backend is present**, so a clean checkout still
gates. The in-repo adapters (`testing/live/adapters/`: daw, notes, patch, room,
urlshortener) are the concrete examples; the RVND adapter, which boots a real
`serve.py` against a throwaway workspace and witnesses the append-only signed
audit chain, lives downstream in `loomground-patchbay`, not here. The SKILL.md
visual loop is a further, separate step.

The backend gate — the inverse (`specs/backend-from-model.md`) — proves a
backend *generated from a source* conforms to it:

```
npm run test:backend       # default source; per-source adapter
                           # (testing/backend/adapters/): B0 provenance, B1
                           # surface conformance, B1b mutation class, B2 the
                           # source's behavioural vectors, B3 self-consistency
npm run test:backend:all   # all four reference sources through the same harness
```

Four reference sources, gated by the same unchanged harness (which is how it
proves it is source-agnostic): `sources/notes/` (a CRUD-shaped store),
`sources/inventory/` (numeric state with a `take` that refuses when stock is
insufficient), `sources/urlshortener/`, and `sources/jobqueue/`. Each is a
manual, the scaffold generated from it, a shipped
`provenance.json` stamp, and a `vectors.json` of given/when/then behaviours the
gate runs chunked by domain.

Adapter modules are executable code, so every adapter-loading entry point is
file-only and root-contained after realpath resolution. Run the dedicated
security teeth for rejected `data:`, HTTP(S), traversal, and symlink escapes:

```
npm run test:security
```

Direct live/backend gate calls authorize their own testing directory.
Conformance profiles authorize adapters below the profile directory or the
builder repository root; an adapter elsewhere must be packaged below the
profile rather than referenced through an absolute path or `..` traversal.

## Install

```bash
cp -r skill /path/to/your/skills/mental-twin
```
