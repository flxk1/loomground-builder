# Rationale — mental twin of the MCP reference git server

Target: `mcp-git` v1.28.1 (MCP reference `git` server, Python stdio), protocol `2025-06-18`.
Operator: a release manager reviewing a repository's state before a release.
Fixtures captured 2026-07-23 against a sandbox repository (3 commits on `main`,
one `feature/retry-logic` branch, a modified tracked file, one untracked file).

## Genre choice

**Tool twin.** The target is a single MCP server with one flat tool catalogue and no
workflow or governance semantics of its own; the operator's task ("review state before
release") maps directly onto the server's read tools, with the mutating tools present
but deliberately out of the effortless path. A workflow twin would have required
inventing a release process the server does not express; a governance twin has no
verdict surface to render here.

## Mode

**Fixture-backed.** The server is stdio JSON-RPC; there is no same-origin HTTP surface a
static HTML file could call, so live mode is impossible by construction. Per the skill,
fixtures were captured first (initialize result, `tools/list`, and read-only-annotated
tool responses, all verbatim) and every state view is visibly labelled `FIXTURE`. The
fixture JSON is embedded verbatim inside `twin.html` (a `file://` page cannot fetch
sibling files); the canonical copies live in `fixtures/`.

## Scope and exclusion list

All 12 catalogued tools are in scope. **The exclusion list is empty** — no catalogued
function is omitted. The twin's catalogue table (bottom of the page) shows every tool,
its annotations verbatim, the gate applied, and the control it maps to.

## Per-control op mapping

| Control in twin | Catalogued op | Gate |
|---|---|---|
| State panel "Working tree status" | `git_status` | ungated read, fixture-rendered |
| State panel "Branches" | `git_branch` (`branch_type: local`) | ungated read, fixture-rendered |
| State panel "Commit history" | `git_log` | ungated read, fixture-rendered |
| State panel "Unstaged changes" | `git_diff_unstaged` | ungated read, fixture-rendered |
| State panel "Staged changes" | `git_diff_staged` | ungated read, fixture-rendered |
| State panel "Diff vs feature/retry-logic" | `git_diff` (`target: feature/retry-logic`) | ungated read, fixture-rendered |
| State panel "Commit detail (HEAD)" | `git_show` (`revision: HEAD`) | ungated read, fixture-rendered |
| Panel "Failed call" | `git_show` (`revision: no-such-rev`) | captured error, rendered as ERROR in the server's words |
| Op card `git_add` | `git_add` | confirm card |
| Op card `git_commit` | `git_commit` | confirm card |
| Op card `git_create_branch` | `git_create_branch` | confirm card |
| Op card `git_checkout` | `git_checkout` | confirm card |
| Op card `git_reset` | `git_reset` | confirm card, destructive framing: type the tool name to enable confirm |

Gating follows the annotations table in the skill's MCP surface digest:
`readOnlyHint: true` → ungated (7 tools); `destructiveHint: true` → strongest confirm
framing (`git_reset`); everything else → confirm card (4 tools). The gate code also
fails closed for a tool with no annotations, though no such tool exists in this
catalogue. Because the twin is fixture-backed, confirming a gated op composes the exact
`tools/call` JSON-RPC request and renders **NOT SENT — NO LIVE CONNECTION**; no success
is ever shown, and the page contains no network API at all.

## Brand decisions and sources

No brand assets were supplied. The operator's request named an aesthetic — "calm dark
UI, corporate neutral" — and that wording is the sole brand source; nothing else was
invented. Decisions derived from it:

- Dark slate neutrals (`#14171c` page, `#1b1f26` panels), low-contrast borders, muted
  desaturated lamp colours (olive for FIXTURE, green for READ-ONLY, amber for MUTATES,
  red for DESTRUCTIVE/ERROR) — calm, not alarming; signals still always carry text.
- System font stack (UI and mono) — corporate-neutral and required anyway by the
  no-external-origins rule.
- 6px radii, single restrained steel-blue accent for interactive affordances.
- All identity lives as CSS custom properties in the single `:root` block; restyling is
  a token swap.

The requested asymmetry — reading effortless, changing deliberate — is structural:
reads render immediately as open panels; every mutating op starts collapsed behind a
"Prepare…" button, then a parameter-complete confirm card, with an extra
type-the-tool-name step for the destructive `git_reset`.

## Checklist results (references/checklist.md, every line)

Walkthrough lines were executed headless in jsdom (script-executing DOM), because the
available browser pane renders files outside the project as non-drivable static
snapshots and blocks localhost; this substitution is recorded per line below.

**Completeness**

1. Every control maps to a catalogued op — **PASS.** Mapping table above; the in-twin
   catalogue table cross-references all 12 tools to their controls.
2. Every rendered state value comes from a real read; fixture-backed views visibly
   labelled — **PASS.** jsdom walkthrough verified panel text is byte-identical to the
   on-disk fixtures and that every state panel carries a visible `FIXTURE` lamp.
3. Every excluded function appears in the exclusion list — **PASS** (vacuously: the
   exclusion list is empty and stated as such; all 12 tools are in scope).

**Gating**

4. Every mutating (or unstamped, fail-closed) op behind a confirm card stating op,
   params, and that it will be recorded — **PASS**, with a caveat: all 12 tools carry
   annotations, so the fail-closed branch for unstamped tools exists in the gate code
   but could not be exercised against a real unstamped tool. The recording statement is
   conditional ("on a live connection this call ... is recorded"), because in
   fixture-backed mode nothing is sent and claiming otherwise would be false.
5. No write fires on load, render, or any interaction other than explicit confirm —
   **PASS.** The artifact contains no network API whatsoever (no fetch/XHR/WebSocket/
   sendBeacon), verified by scan; jsdom verified cancel leaves no result rendered.
6. A refused/errored call renders as failure in the server's words — **PASS.** The
   captured `git_show` error ("Ref 'no-such-rev' did not resolve to an object") is
   rendered verbatim under an `ERROR — isError: true` lamp, never as success.
7. Verdict/status vocabulary verbatim; severity order respected — **PASS by
   interpretation.** This server has no verdict vocabulary or severity ordering; the
   line was interpreted as: server response text and annotation names render verbatim
   (they do; panels are byte-identical to fixtures, annotations shown as
   `readOnlyHint: true` etc.).
8. Lamps discrete; no dials, gauges, scores, or percentages — **PASS.** Only discrete
   text-labelled lamps; nothing numeric is derived from any response.
9. Every colour signal has a text label; page makes sense without colour — **PASS.**
   jsdom verified every lamp has non-empty text; mutating/destructive lamps also differ
   from read lamps by indicator shape. (Checked by inspection of the rendered DOM, not
   by a grayscale screenshot.)
10. Decision options unranked, no default, no recommendation; recording demands a
    rationale field — **NOT APPLICABLE.** The catalogue contains no decision or
    option-recording operation; there is nothing to render unranked. Recorded rather
    than checked.
11. Nothing requested is shown as granted — **PASS.** A confirmed op renders
    `NOT SENT — NO LIVE CONNECTION`; no success state exists anywhere in the twin.

**Artifact class**

12. One static HTML file, inline script, no build step — **PASS.** `twin.html` is
    self-contained and runs from `file://`. (It was *generated* by a script that embeds
    the fixture JSON verbatim; the artifact itself needs no build step to run.)
13. No external origins — **PASS.** Verified by scan: no http(s) `src`/`href`, no
    `@import`, no remote fonts, no network APIs; all assets inline.
14. All identity in CSS custom properties in one `:root` block — **PASS.** Verified:
    exactly one `:root` block; colours, radii, fonts, spacing all tokenised.

**Walkthrough**

15. Open the twin; every surface renders without console errors — **PASS (jsdom).**
    No script errors on load; 7 read panels + error panel + 5 op cards + 12-row
    catalogue all render. Real-browser verification was unavailable in this
    environment (see note above).
16. Drive one read flow end to end; state matches the fixture — **PASS (jsdom).**
    `git_status` and `git_log` panel text byte-identical to `fixtures/*.json`.
17. Drive one gated flow to confirm card and cancel; nothing fired — **PASS (jsdom).**
    Opened `git_commit`, cancelled; no result rendered. "Server log untouched" is
    vacuous here — the twin has no transport, and the on-disk fixtures are unchanged.
    The capture server process no longer exists to consult.
18. If same-origin live mode is available, drive one gated flow through confirm —
    **NOT APPLICABLE.** No live mode exists: the target is a stdio process with no
    HTTP surface a static page could reach.

**Totals: 16 pass (3 with recorded caveats), 2 not applicable with reason, 0 fail.**

## Known limitations

- Fixture-backed only. All state is a 2026-07-23 snapshot; mutating ops compose the
  exact request but cannot send it. A live twin would need a stdio↔HTTP bridge, which
  the skill's artifact class (static file, no external origins) cannot supply.
- The pinned `repo_path` prefilled in op cards points at the sandbox repository used
  for capture, which lived in a session-scoped scratchpad and no longer exists.
- The walkthrough ran in jsdom, not a real browser; visual rendering (layout, colour)
  was reviewed only via the static snapshot preview.
- `git_log` and `git_show` fixtures contain the server's raw Python reprs
  (`<git.Actor "...">`); the twin renders them verbatim per "render, never simulate",
  at some cost to polish.
- The error fixture was deliberately provoked (read-only `git_show` with an
  unresolvable revision) because no read-only call on a healthy repository errors.
- The fail-closed path for unannotated tools is implemented but untested against a
  real unannotated tool.
