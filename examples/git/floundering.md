# Floundering log — mental-twin skill test against the MCP git server

An honest record of every point where the skill's content was insufficient, ambiguous,
or wrong for this target, and what was decided instead. Ordered roughly by severity.

## 1. SKILL.md's cycle is written in RVND vocabulary; the MCP path is a translation exercise

Cycle step 1 says: pull the catalogue "via the help surface" and record each op's
"`mutates` stamp". Neither exists for an MCP target — there is no help surface (it's
`tools/list`) and no `mutates` stamp (it's the `readOnlyHint`/`destructiveHint`
annotations). surface-mcp.md's gate table covers the mapping, but SKILL.md and the
checklist keep using RVND terms ("op stamped `mutates`", "help surface", the RVND
launch command inline in step 1), so at every step I had to decide which sentence was
RVND-only and what its MCP equivalent was. The equivalence readOnlyHint-absent ==
"stamped mutates" is inferable but never stated as such.

## 2. What a gated op does in fixture-backed mode is unspecified

The skill demands every mutating op sit behind a confirm card "stating the op, its
params, and that it will be recorded" — but in a fixture-backed twin there is no
connection, so confirming can neither send nor record anything. Nothing in SKILL.md,
surface-mcp.md, or the checklist says what Confirm should do offline. I guessed:
compose the exact `tools/call` JSON-RPC payload and render it under an explicit
`NOT SENT — NO LIVE CONNECTION` failure lamp, never a success. I also had to weaken
the mandated "it will be recorded" wording to a conditional ("on a live connection
this call ... is recorded") because the unconditional sentence would be a false claim
in this mode. Checklist line 4 and the "render, never simulate" rule pull against
each other here and the skill does not resolve it.

## 3. Doctrine and checklist lines assume an RVND-shaped surface

"Decision options render unranked, no default, no recommendation; recording demands a
rationale field" and "Verdict/status vocabulary verbatim; severity order respected"
have no referent on a git server: there are no decision ops, no verdicts, no severity
scale. The checklist says a line is fixed or recorded as a limitation — it does not
admit a "not applicable" outcome, yet two lines can only be N/A here. I recorded them
as N/A with reasons, which is honest but technically outside the checklist's own
vocabulary of outcomes.

## 4. Error rendering is required, but error fixtures are effectively forbidden

Checklist line 6 requires an errored call to render in the server's words. The
fixture-capture rule says only read-only-annotated tools may be called — and on a
healthy repo no read-only call errors, so a compliant capture run can never produce
the error fixture the checklist needs. I decided that deliberately provoking an error
from a read-only tool (`git_show` with revision `no-such-rev`) is within the rules.
The skill says nothing about capturing error fixtures at all.

## 5. "Fixtures next to the twin" collides with the single-file, no-external-origin artifact

A static HTML file opened from `file://` cannot `fetch()` sibling fixture files
(browser CORS/file policy), and the artifact class forbids serving or external
origins. So "the twin runs on these fixtures" is only satisfiable by embedding the
fixture JSON verbatim inside the HTML, keeping `fixtures/` as the canonical copies.
The skill never addresses how the single file is supposed to read the fixture files
it requires to sit next to it.

## 6. "Walkthrough (manual, in a browser)" assumed a browser I did not have

The available browser pane rendered the delivered file (outside the project folder)
as a non-drivable static snapshot — no console, no clicks — and navigation to a
localhost test server was blocked by policy. The walkthrough therefore ran headless
in jsdom (script-executing DOM, 24 assertions). The checklist gives no fallback
guidance for environments where a drivable browser is unavailable; I recorded the
substitution per line rather than pretending a manual browser pass happened.

## 7. `openWorldHint` exists in the wild but not in the gate map

Every tool in this server's catalogue carries `openWorldHint: false`. The skill's
annotations table does not mention `openWorldHint` at all. I ignored it (no defined
twin behaviour), but a server with `openWorldHint: true` tools would leave the twin
author guessing again.

## 8. "Ask for brand assets" assumes an interactive operator

Cycle step 2 says to ask for brand assets or a named aesthetic. This was a
non-interactive run; the request itself contained a named aesthetic ("calm dark UI,
corporate neutral") and I treated that as the answer, noting in the rationale that no
assets were supplied. The skill doesn't say whether a phrase in the original request
counts as "supplied" or whether the plain-neutral fallback should apply.

## 9. Verbatim rendering vs "reading should be effortless"

The server's `git_log`/`git_show` responses embed raw Python reprs
(`Author: <git.Actor "Release Sandbox <redacted>">`,
`Date: datetime.datetime(...)`). "Render, never simulate" forbids cleaning this up,
so the release manager reads repr noise. The skill gives no allowance for
presentation-level reformatting of a read response, and I did not invent one — but
the tension with the operator's "effortless reading" requirement is real and
unresolved by the skill.

## 10. Environmental, not a skill fault: the scratchpad was wiped mid-cycle

Between artifact generation and final verification the session scratchpad (venv,
sandbox repo, driver script, build script) was destroyed; the delivery directory
survived. Consequences, recorded rather than papered over: the checklist's "server
log / fixture untouched" cancel-check degrades to "the twin contains no network API
and the on-disk fixtures are unchanged"; the `repo_path` pinned in the twin now
points at a deleted sandbox; the walkthrough tooling was rewritten from the
transcript and re-run against the delivered file (24/24 assertions pass). One
walkthrough assertion had to be corrected during this: a naive `/success/i` scan
flagged the twin's own sentence "No success is implied or shown" — the fix was to
the test (assert the lamp reads `NOT SENT — NO LIVE CONNECTION`), not the twin.
