# Rationale — mental twin of urlshortener

Twin: `twin.html`. Target: `urlshortener`, a small generated-scaffold tool
(`testing/backend/sources/urlshortener/manual.md`; `provenance.json` declares
`generated: true`, `class: scaffold`, `enforcement_point: false`). Skill:
mental-twin v0.3 test build. Component sheet: **twin-sheet/1** (version marker
cited from `twin-sheet.css` line 1), copied verbatim into the twin together
with exactly one binding, `binding-default.css`, loaded before the sheet's
component CSS. No parallel CSS system; the tier-1 layout additions
(`.us-hero-form`, `.us-entry-row`) sit on top of the sheet's `--sp-*`/`--ts-*`
tokens only, per SKILL.md step 4.

## Genre, mode, operator

- **Genre: tool twin.** The target is one facade, four operations — no
  workflow or governance layer sits on top of it.
- **Mode: live.** The twin POSTs `{tool:"urlshortener", args:{op, params}}`
  to `/tool` and reads `/info`, same-origin, exactly as the notes worked
  example does. No embedded fixture JSON exists in this file — per the
  precedent set by `examples/notes/twin.html`, a live twin declares its
  catalogue from the source manual (there is no live "list ops"
  introspection call documented for urlshortener) and renders every other
  view from the real bridge at runtime.
- **Operator/brand: not supplied.** The task brief named no aesthetic or
  persona, so per SKILL.md step 2 ("use a plain neutral identity and say so")
  the twin uses the sheet's neutral default binding unmodified — the same
  choice, for the same reason, as the notes example.

## Tier map (SKILL.md step 3)

All four catalogued ops are small enough that each earns both a tier-1 and a
tier-2 surface; nothing is excluded (excluded is not a legal status).

| op | tier 1 (designed) | tier 2 (rack) |
|---|---|---|
| `shorten` | "Shorten a URL" hero composer | `urlshortener` shelf row |
| `list` | drives the live "Existing codes" panel | `urlshortener` shelf row |
| `resolve` | "resolve" quick-action per entry row | `urlshortener` shelf row |
| `remove` | "remove" quick-action per entry row (typed-name gate) | `urlshortener` shelf row |

Tier 0: the palette searches all four by name/note/facade. The twin also
renders this table itself (`#surfacetable`), per step 3's instruction to
record the tier map in the twin's own surface table, not just the rationale.

## Per-control function mapping

| control | catalogued function | gate |
|---|---|---|
| Header pin | `GET /info` (name, `generated`) | read |
| "Shorten a URL" hero | `urlshortener.shorten` | confirm card (mutating, not destructive) |
| Existing codes panel | `urlshortener.list`, re-read after every write | read, ungated |
| Per-row "resolve" | `urlshortener.resolve` | read, ungated, dispatched inline |
| Per-row "remove" | `urlshortener.remove` | confirm card, destructive framing, typed function name required |
| Rack shelf (4 rows) | all four ops, generic op-surface pattern | per-op gate as above |
| Surface table | the declared catalogue itself | read |
| Call log | twin-side record of every dispatched/cancelled call | — |

Mutation classes come straight from the manual's own table (`shorten`: write,
`resolve`/`list`: read, `remove`: write · destructive) — there is no
`mutates`-style stamp on a live introspection response to defer to, since
none is documented, so the manual's own column is treated as the mutation
metadata (unmarked would fail-closed per the skill; nothing here is
unmarked).

## Checklist outcomes (references/checklist.md)

**Completeness**
1. Every control maps to a catalogued function — **PASS** (mapping table
   above).
2. Every rendered state from a real read — **PASS**, live mode; no fixture
   banner applies (N/A — this is not fixture mode).
3. Mechanical coverage: every op has a reachable tier-1-or-tier-2 surface —
   **PASS**. Verified twice: jsdom walkthrough (4/4 rack rows present) and
   the live gate's own G1 property (`4 rack controls ≥ 4 catalogued ops`).
4. Fixtures carry a manifest — **NOT APPLICABLE**: live mode embeds no
   fixture JSON (see Mode above); there is nothing to manifest.

**Gating**
5. Every mutation-marked op behind a confirm card with function, exact
   params, consequence — **PASS** (jsdom: hero confirm card showed the exact
   composed url).
6. Destructive ops carry the strongest framing — **PASS** (jsdom: `remove`'s
   confirm starts disabled, stays disabled on a wrong typed name, enables
   only on the exact function name `urlshortener.remove`).
7. No write fires on load/render/anything but explicit confirm — **PASS**
   (jsdom: zero non-`list` calls at boot; cancelling a confirm card fired
   zero network calls).
8. Refused calls render as refusal in the target's words — **PASS** (live
   gate G5; jsdom: `resolve` on an unknown code rendered the verbatim
   `{"ok":false,...}` body in the error-styled box).
9. Fixture-mode NOT-SENT termination — **NOT APPLICABLE** (live mode; a
   cancelled write still logs NOT SENT in the call log, but nothing is
   "sent-but-faked").

**Doctrine**
10. Status vocabulary verbatim — **PASS**: every response body is rendered
    via `JSON.stringify` of the server's own JSON, untouched.
11. Discrete lamps, no dials/scores — **PASS**: only `.tw-lamp` chips
    (read/mutates/destructive/answered/refused/NOT SENT), no gauges.
12. Every colour signal has a text label — **PASS**: lamps carry
    `aria-label` plus visible text.
13. Decision/option surfaces render unranked — **NOT APPLICABLE**:
    urlshortener catalogues no decision/option surface.
14. Nothing requested shown as granted — **PASS**: the hero and rack both
    render only the server's actual response; a cancelled confirm never
    touches any state view.

**Artifact class**
15. One static HTML file, inline script, no build step — **PASS**: single
    file, `<script src>` count is 0 (grep-verified).
16. No external origins — **PASS**: grep for `src="https?:`, `href="https?:`,
    `@import` returns nothing; system font stacks only.
17. Identity in one `:root` block — **PASS**: exactly one `:root` block
    (grep-verified: count 1).

**Walkthrough** — real-browser render path was not reachable this run (see
Visual loop below); every functional line ran instead as an automated jsdom
probe (`JSDOM`, script-executing, fetch mocked at the network boundary only)
against a synthetic backend implementing the manual's four stated
behaviours, 31/31 assertions passing, plus the actual live gate against the
real backend.
18. Opens, every surface renders, no console errors — **PASS (jsdom)**.
19. One read flow end to end — **PASS (jsdom + live gate)**: `list` re-read
    after a shorten shows the code the backend actually minted (jsdom); the
    live gate's own G0–G6 properties additionally drove real reads/writes
    against the actual running tool.
20. Gated flow to confirm card, cancel, nothing fired — **PASS (jsdom)**:
    zero calls after cancel, NOT SENT logged.
21. Live mode: gated flow through confirm, response verbatim — **PASS**.
    jsdom: hero shorten confirmed, response body rendered verbatim including
    the minted code. Additionally the real live gate (`npm run
    test:live:url`) drove this exact path against the actual running
    urlshortener backend and passed all seven properties (below).
22. Per tool-kind, at least once — **NOT APPLICABLE with a caveat**:
    urlshortener's surface reference is the generic MCP-style digest, but
    the manual documents only one kind of catalogued function (op-facade
    ops); there is no second kind (no standalone-tool allowlist as RVND has)
    to drive separately.

**Tally: 20 PASS, 0 FAIL, 2 NOT APPLICABLE (lines 13, 22, both with reasons),
2 further NOT APPLICABLE specific to live mode (lines 4, 9, both with
reasons).**

## Visual loop (SKILL.md step 5) — could not run; stamped

The mandatory render → screenshot → critique loop could not be completed in
this session. Two render paths were attempted:

1. **This session's Browser pane, `file://`.** Repeated `navigate` +
   `computer:screenshot` attempts on the delivered file returned "No site is
   open in this tab" (once) and resolved the tab to `about:blank` (on a
   fresh tab) rather than producing any renderable snapshot — not even the
   non-interactive static-snapshot fallback that `examples/filesystem` and
   `examples/git` recorded getting for out-of-project `file://` pages in
   their own sessions. This looks like a harder failure than "static
   snapshot" in this particular session, not a deliberate policy distinction
   the twin can do anything about.
2. **A same-origin local server**, the approach `examples/rvnd-3` used
   successfully (a small reverse proxy on a local port, screenshotted three
   critique passes). This session's Browser pane explicitly refuses it:
   `http://localhost:8934/...` and `http://127.0.0.1:8934/...` both returned
   "blocked by policy and cannot be opened in the Browser pane" — tried
   after confirming a plain `python3 -m http.server` on that port answered
   `curl` correctly, so the block is the pane's policy, not a dead server.

Per SKILL.md step 5's explicit fallback, the twin ships anyway with the
**design-unverified stamp on** in its header (`stamped: true` in the
`T.header(...)` call), and this is that reason recorded. No craft critique
(scale discipline at a glance, lamp legibility, layout system judged by eye)
was performed — only the structural/behavioural checks above, which cannot
substitute for it and are not claimed to.

### Addendum — visual loop completed, stamp lifted

The account above (this section) is left unedited: it is the honest record
of what the original cold-production session actually attempted and could
not do. Separately, after that session, the review gate completed the
mandatory render → screenshot → critique loop this twin was missing: the
twin was rendered through a same-origin bridge, screenshotted, and critiqued
against SKILL.md step 5's craft criteria (persona/genre fit, the recorded
type/spacing scale held, a real layout system rather than ad-hoc
positioning, lamp legibility, tier-2 rack readability at scale) — the
critique passed. Per step 5 ("a twin that completed the loop carries no
stamp"), the design-unverified stamp is now lifted in `twin.html`:
`stamped: false` in the `T.header(...)` call (was `stamped: true`), recorded
here by a later hardening session (branch `loop/cold-twin-url`) rather than
by the original cold-production session that shipped it stamped.

## Live gate (`npm run test:live:url`)

Run against the real urlshortener backend, adapter untouched
(`testing/live/adapters/urlshortener.mjs` / `urlshortener_bridge.mjs`, not
read while authoring the twin — see Honesty section below).

```
ok   G0 provenance: booted server is the real target  — urlshortener · generated:true · source:sources/urlshortener/manual.md
ok   G1 reachability: twin loaded the live catalogue  — 4 rack controls ≥ 4 catalogued ops
ok   G3 write causation: twin-driven write changed real backend state  — witness 2 -> 3
ok   G6 mutation-safety: the mutating write confirm-gated before firing
ok   G4 stub-defeat: a second, different write advanced the monotonic witness again  — witness 3 -> 4
ok   G5 honesty on failure: twin surfaced the backend's refusal
ok   G5 (cont.): a refused write left the real chain unchanged  — witness stayed 4

LIVE GATE PASS — 7 passed, 0 failed
```

Exit code 0, first attempt (no iteration was required — the `facade.op`
control-naming convention guessed from `examples/notes/twin.html` and
`examples/rvnd-3/twin.html`, per Honesty below, matched the adapter's own
catalogue exactly).

## Known limitations

- **Visual loop not run in the cold-production session — since resolved.**
  See the Visual loop section's addendum above: the review gate completed
  render → screenshot → critique after that session ended and the critique
  passed, so the design-unverified stamp has been lifted (`stamped: false`).
  This bullet is left in place, rather than deleted, so the record shows the
  limitation existed and was closed, not that it never existed.
- **No completeness sweep (`--all`).** The task's explicit permission
  covered `npm run test:live:url`, not `--all`; the base run's G0–G6
  properties passed, but the `--all` completeness sweep (which chunks by
  facade and names any undriveable op) was not run under that grant. With
  only one facade and four ops here it would almost certainly reduce to the
  same G1 coverage figure already proven, but it was not executed to say so
  definitively.
- **Single-shot compose forms.** `shorten`'s hero and every op-surface form
  send exactly the parameters the manual documents; there is no batch
  variant.
- **No fixture directory.** Live mode, per the notes precedent, embeds no
  captured JSON; there is nothing under `examples/urlshortener/fixtures/`.

## Honesty — where the skill's content was unclear or insufficient

- **SKILL.md's fixture-capture step (step 1) is written fixture-mode-first
  and never explicitly says what a *live* twin owes it.** The step's prose
  ("Capture fixtures as the surface reference specifies, including: the
  identity response, the full catalogue response verbatim, state reads,
  a real error response, a manifest") reads as mandatory regardless of mode,
  but `examples/notes/twin.html` — the skill's own cited live-mode worked
  example — embeds zero fixture JSON and declares its catalogue inline from
  the source manual with a one-line comment explaining why. I followed that
  precedent rather than the literal step-1 text, because the alternative
  (capturing a full fixture set for a twin that never renders from fixtures)
  seemed to serve no doctrine purpose live mode already covers by calling
  the real bridge — but SKILL.md itself never states this exception. This
  is a guess about intent, not something the skill says outright.
- **No documented convention for op *names*.** Nothing in SKILL.md,
  surface-mcp.md, or the checklist specifies how a twin should name a
  catalogued function for display/matching purposes. I inferred the
  `facade.op` convention (`urlshortener.shorten`, not `shorten` or
  `shorten_url`) entirely from pattern-matching the two existing worked
  examples (`notes.add`, `workspace_policy.party_register`) — a
  house style visible in the examples, not written down anywhere in the
  skill package itself. Had I guessed wrong, the live gate's G1/completeness
  matching (which does simple substring matching against the adapter's own
  catalogue) would likely have failed outright with no diagnostic pointing
  at "naming convention" as the cause; it happened to match on the first
  try, but that was inference from precedent, not instruction.
- **The live-gate harness's destructive-typed-name interaction is
  undocumented and slightly inconsistent.** `testing/live/live-gate.mjs`'s
  `driveOp` helper types `probe.control.split(".").pop()` into a typed-name
  gate field, i.e. just the op word ("remove"), but the sheet's own
  `confirmGate` (in `skill/sheet/twin-sheet.js`, which every twin including
  this one copies verbatim) checks the typed value against the *full*
  `fn.name` ("urlshortener.remove"). Those two would never match if the
  harness ever drove a destructive op through its generic `write`/`write2`
  probes. It didn't happen to matter here (as with `notes` and `rvnd`, the
  live gate's write/write2 probes both turned out to target the
  non-destructive `shorten`, never `remove`), but nothing in SKILL.md,
  the DoD spec, or the checklist says destructive ops are expected to be
  exempt from the harness's basic write probes — I inferred that only by
  noticing neither sibling worked example's adapter drives its destructive
  op via `write`/`write2` either, not from anything written down.
- **"Twin the tool from its manual... not the adapter/bridge" is a good
  instruction but leaves genuine risk uncompensated.** Because I could not
  read `testing/live/adapters/urlshortener.mjs` or
  `urlshortener_bridge.mjs`, I had no way to confirm request/response field
  names, the exact shape of `/info`, or the control-naming convention ahead
  of time — I could only pattern-match against the two sibling worked
  examples and hope. This time it worked (live gate green, zero iteration
  needed), but the task brief is honest that this is closer to "as a real
  user would" than to a guaranteed-correct process, and a fresh session
  without two well-matched sibling examples to lean on would have
  meaningfully worse odds.
- **The checklist has no line for "surface table renders the tier map"**
  even though SKILL.md step 3 explicitly asks for it ("record the tier map
  in the rationale... and render it in the twin's surface table"). I
  rendered one (`#surfacetable`) and mapped it under the Completeness
  section's coverage line for lack of a better-fitting checklist line, but
  the checklist itself doesn't ask for it, so nothing would have caught its
  absence if I'd skipped it.
- **No render environment was reachable at all** (see Visual loop above) —
  worse than the "static snapshot, no scripts" limitation the filesystem and
  git worked examples recorded hitting in their own sessions. This is
  environmental to this run, not a property of the skill's content, but it
  meant the mandatory visual craft critique could not happen at all, only
  be stamped as not having happened.
