# Release Definition of Done

A `loomground-builder` release is done only when the complete product claim is
true:

> Given an honestly modelled object surface and requested depth, the builder
> generates a deterministic ad-hoc language, writes the object into Versum,
> obtains usable Solver reasoning through the neutral route, builds a complete
> twin, and that twin controls the real backend safely and faithfully.

Component success is not release success. In particular, green M1–M4 results
must never conceal a missing Solver seam, missing end-to-end path, unverified
visual artifact, or unpackageable skill.

## Verdict rule

`python3 -m release.gate` is the sole release authority. It returns `PASS` only
when every mandatory row in `release/gates.json` passes in the same run.

- `PASS`: the independent witness passed and its mandatory teeth test exists.
- `FAIL`: a witness ran and rejected the artifact.
- `BLOCKED`: required code, evidence, dependency, or executable gate is absent.
- `SKIP` is forbidden for release. A target that cannot run is `BLOCKED`.

There are no waivers, expected failures, percentages, or “green enough”
verdicts. Release evidence is disposable: it must be reproducible from the
commit being released.

## Mandatory claims and independent witnesses

| ID | Release claim | Independent witness | False-green defeated |
|---|---|---|---|
| R0 | The release contract is complete and machine-readable. | `release/gates.json` schema and prerequisite audit. | A prose-only checklist silently omitting a layer. |
| R1 | Generated languages are valid, 5D-faithful, depth-faithful and deterministic (M1–M3). | Versum validators through `meta.gate`. | Trusting generator self-report. |
| R2 | Every surface/tier survives Ingest→Versum→read-back intact (M4). | Versum graph/nD loaders through `meta.gate_m4`. | Dropped edges, corrupted dimensions, or lost nD detail. |
| R3 | The stored graph reaches Solver over `reasoning.edges/v1` and yields typed, source-grounded genre/layout reasoning (M5). | A real Solver invocation through `meta.gate_m5`. | A fabricated or registered ad-hoc-language shortcut. |
| R4 | Object→language→Versum→Solver→builder→twin works as one chain (M6). | `meta.gate_m6`, ending in the unchanged live witness. | Green isolated components with a broken seam. |
| R5 | Every unmodellable or incomplete case fails closed throughout (M7). | `meta.gate_m7`; no write, Solver call, or twin generation after quarantine. | Invented axes, partial graphs, or fake success. |
| R6 | Every supported genre controls a real backend and has delta-zero catalogue coverage. | Live gate with `--all` for rack, synth, DAW and spatial adapters; verdict must be `pass`, never `skip`. | A showcase twin or spot-check standing in for universality. |
| R7 | Lossless degradation preserves the machine control set. | D6 3D→2D→text invariance gate. | A visual fallback that loses operations. |
| R8 | Generated backend scaffolds conform to sources and remain non-enforcement. | All backend source gates. | A twin passing against a lying or no-op scaffold. |
| R9 | Gates have teeth. | Dedicated release teeth gate mutates each authority and requires rejection. | Rubber-stamp gates that cannot fail. |
| R10 | The shipped visual artifacts were rendered and evaluated. | Hashed screenshot evidence plus a fail-closed RVND policy verdict tied to the commit and render-set digest. | Treating jsdom functional success, an unverified assertion, or a person-shaped placeholder as visual quality. |
| R11 | The release is installable and its identity/version are coherent. | Plugin manifest validation and clean-room install/smoke gate. | A green source tree that cannot be consumed. |

## Teeth requirements

The release teeth gate must deliberately introduce, one at a time:

1. an invalid sixth dimension;
2. a dangling or dropped semantic edge;
3. a dropped nD assignment;
4. a Solver response with ungrounded or wrong-version evidence;
5. a missing catalogue control;
6. a scrambled visible-label set (machine grammar must still drive);
7. a no-op backend write;
8. a quarantine bypass;
9. a package with a missing required file or mismatched version.

For each mutation it must assert that the corresponding real gate returns
non-zero. Restoring the fixture after mutation is part of the test. A comment
claiming a historical negative test is not release evidence.

## Visual evidence contract

`release/evidence/visual-review.json` is an ignored, locally generated release
artifact, created after checking out the candidate commit; it does not alter
that commit and is not a substitute for the screenshots it names. It must
contain:

- the exact Git commit;
- every supported genre and degrade mode;
- an existing local screenshot path and SHA-256 for each rendering;
- render viewport and command;
- RVND authority record, date, findings, fixes, and final disposition;
- zero unresolved blocking findings.

The gate invokes RVND's packaged `rvnd-visual-verdict` policy authority. The
Builder release environment must install the approved RVND distribution; a
sibling RVND checkout is neither discovered nor accepted as a substitute.
RVND recomputes every hash, validates the complete render matrix and minimum
machine-checkable visual properties, and binds its auditable `GO` verdict to
the candidate commit and canonical render-set digest. Missing RVND, unknown
policy versions, stale evidence, and any verdict other than `GO` fail closed.
There is no human-review field and no synthetic human identity.

The authority object is:

```json
{
  "owner": "RVND",
  "policy": "loomground-builder.visual-release/v1",
  "verdict": "GO",
  "input_digest": "<sha256 of canonical commit + render records>",
  "audit_triple": {
    "subject": "RVND",
    "predicate": "GO",
    "object": "loomground-builder.visual-release/v1",
    "input_digest": "<same sha256>"
  }
}
```

The RVND verifier, rather than the producer of the JSON, is the authority: it
recomputes the digest and every objective check before returning `GO`.

## Release procedure

1. Run `python3 -m release.gate --audit` early. `BLOCKED` rows are unsatisfied
   release requirements.
2. Implement and teeth-test missing rows; never mark a row optional to obtain
   green.
3. Produce visual evidence from the exact candidate commit.
4. Run `python3 -m release.gate` from a clean checkout.
5. Release only the exact commit printed by the passing gate.
