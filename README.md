<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright 2026 flxk1 -->

# tool-designer

The mental-model-based designer — internally the **mental twin**: a builder
that reads a tool's machine-readable surface and generates a reproduction of
its functions in a simple UI. Tool-agnostic core plus a per-tool surface
pack; RVND is the first case.

## The model

- **Inside** is a tool's functions and state; **outside** is a generated
  surface over them — the twin. The twin is the human face of the same
  machine-readable surface an agent drives: one catalogue, two projections.
- **The pipeline**: read the machine-readable surface, infer its genre and
  information architecture, generate the twin as a bespoke artifact (from a
  description plus examples, not by re-theming a shipped shell and not by
  assembling prebuilt units), then validate the twin against the surface for
  coverage and safety.

## Siblings

- **`rvnd`** — the governance MCP server, its panel pack, and the privacy
  lock.
- **`loomground-patchbay`** — the governance console instrument. It is the
  *house twin*: one specific rendered governance surface. This repo is the
  universal builder that can generate a twin for any tool, of which the
  patchbay-style governance console is the first and reference case.

Status: home repository created ahead of content. The working drafts and the
current build are imported here once they are ready to land.

## Release authority

The executable release contract is
[`specs/release-definition-of-done.md`](specs/release-definition-of-done.md).
Run `npm run test:release:audit` to see readiness blockers and
`npm run test:release` for the sole release verdict. A skipped, missing, or
unrunnable mandatory witness is release-blocking.

## License

Apache License 2.0. See `LICENSES/Apache-2.0.txt` and `NOTICE`.
