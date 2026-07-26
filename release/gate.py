#!/usr/bin/env python3
"""Single fail-closed release authority.

Run ``python3 -m release.gate --audit`` to list missing prerequisites without
executing gates, or ``python3 -m release.gate`` for the release verdict.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = Path(__file__).resolve().parent / "gates.json"
FORMAT = "loomground-builder.release-gates/v1"
REQUIRED_CHECK_IDS = {
    "R1", "R2", "R3", "R4", "R5",
    "R6-rack", "R6-synth", "R6-daw", "R6-spatial",
    "R7", "R8", "R9", "R10", "R11",
}


def _relative_file(value: str) -> Path:
    # Use lexical normalization: venv executables are commonly symlinks to a
    # system interpreter, but the required release artifact is the in-repo
    # symlink itself.
    path = Path(os.path.abspath(ROOT / value))
    try:
        path.relative_to(Path(os.path.abspath(ROOT)))
    except ValueError as exc:
        raise ValueError(f"path escapes repository: {value!r}") from exc
    return path


def load_manifest(path: Path) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if raw.get("format") != FORMAT:
        raise ValueError(f"manifest format must be {FORMAT!r}")
    checks = raw.get("checks")
    if not isinstance(checks, list) or not checks:
        raise ValueError("manifest requires a non-empty checks list")
    ids = [check.get("id") for check in checks]
    if any(not value for value in ids) or len(ids) != len(set(ids)):
        raise ValueError("every check requires a unique non-empty id")
    missing_ids = sorted(REQUIRED_CHECK_IDS - set(ids))
    extra_ids = sorted(set(ids) - REQUIRED_CHECK_IDS)
    if missing_ids or extra_ids:
        raise ValueError(f"release matrix must be exact; missing={missing_ids}, "
                         f"unexpected={extra_ids}")
    allowed = {"command", "visual-evidence"}
    bad = sorted({check.get("kind") for check in checks} - allowed)
    if bad:
        raise ValueError(f"unknown check kind(s): {bad}")
    return raw


def prerequisites(check: dict) -> list[str]:
    return [
        value for value in check.get("requires", [])
        if not _relative_file(value).is_file()
    ]


def validate_visual_evidence(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        evidence = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [f"cannot read visual evidence: {exc}"]
    required = {"commit", "authority", "date", "disposition", "renders", "findings"}
    missing = sorted(required - set(evidence))
    if missing:
        errors.append(f"missing visual evidence fields: {missing}")
    if evidence.get("disposition") != "pass":
        errors.append("visual disposition is not 'pass'")
    if evidence.get("commit") != _git_commit():
        errors.append("visual evidence commit does not match release commit")
    authority = evidence.get("authority")
    if not isinstance(authority, dict):
        errors.append("visual evidence requires an RVND authority record")
    else:
        if authority.get("owner") != "RVND":
            errors.append("visual evidence authority owner must be RVND")
        if authority.get("policy") != "loomground-builder.visual-release/v1":
            errors.append("visual evidence has an unknown RVND policy")
        if authority.get("verdict") != "GO":
            errors.append("RVND visual policy verdict is not GO")
        if not authority.get("input_digest") or not authority.get("audit_triple"):
            errors.append("RVND authority requires input_digest and audit_triple")
    if not evidence.get("date"):
        errors.append("visual evidence requires date")
    blocking = [item for item in evidence.get("findings", [])
                if item.get("severity") == "blocking" and item.get("status") != "resolved"]
    if blocking:
        errors.append(f"{len(blocking)} unresolved blocking visual finding(s)")
    required_views = {
        ("rack", "2d"), ("synth", "2d"), ("daw", "2d"),
        ("spatial", "3d"), ("spatial", "2d"), ("spatial", "text"),
    }
    seen = set()
    for render in evidence.get("renders", []):
        seen.add((render.get("genre"), render.get("mode")))
        relpath, expected = render.get("path"), render.get("sha256")
        if not render.get("viewport") or not render.get("command"):
            errors.append("each visual render requires viewport and command")
        if not relpath or not expected:
            errors.append("each visual render requires path and sha256")
            continue
        target = _relative_file(relpath)
        if not target.is_file():
            errors.append(f"visual render missing: {relpath}")
            continue
        actual = hashlib.sha256(target.read_bytes()).hexdigest()
        if actual != expected:
            errors.append(f"visual render hash mismatch: {relpath}")
    if required_views - seen:
        errors.append(f"visual render matrix incomplete: {sorted(required_views - seen)}")
    return errors


def execute(check: dict) -> tuple[bool, str]:
    command = check.get("command")
    if not isinstance(command, list) or not command or not all(
            isinstance(item, str) and item for item in command):
        return False, "command must be a non-empty argv string list"
    env = os.environ.copy()
    env.update(check.get("env", {}))
    try:
        result = subprocess.run(
            command, cwd=ROOT, env=env, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
    except OSError as exc:
        return False, f"could not execute {command[0]!r}: {exc}"
    output = result.stdout or ""
    forbidden = [needle for needle in check.get("forbid_output", []) if needle in output]
    if result.returncode:
        return False, f"exit {result.returncode}\n{output[-3000:]}"
    if forbidden:
        return False, f"forbidden output observed: {forbidden}\n{output[-3000:]}"
    summary = next((line for line in reversed(output.splitlines()) if line.strip()), "pass")
    return True, summary


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", action="store_true",
                        help="validate contract and prerequisites without running gates")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args(argv)
    try:
        manifest = load_manifest(args.manifest.resolve())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"RELEASE GATE FAIL: invalid manifest: {exc}")
        return 2

    blocked = failed = passed = 0
    print(f"release commit: {_git_commit()}")
    for check in manifest["checks"]:
        missing = prerequisites(check)
        prefix = f"{check['id']} {check['claim']}"
        if missing:
            blocked += 1
            print(f"BLOCK {prefix} — missing: {', '.join(missing)}")
            continue
        if args.audit:
            passed += 1
            print(f"READY {prefix}")
            continue
        if check["kind"] == "visual-evidence":
            errors = validate_visual_evidence(_relative_file(check["requires"][0]))
            ok, detail = not errors, "; ".join(errors) if errors else "evidence hashes complete"
        else:
            ok, detail = execute(check)
        if ok:
            passed += 1
            print(f"PASS  {prefix} — {detail}")
        else:
            failed += 1
            print(f"FAIL  {prefix} — {detail}")

    total = len(manifest["checks"])
    if blocked or failed:
        print(f"\nRELEASE GATE FAIL ({passed}/{total} ready or passed; "
              f"{failed} failed; {blocked} blocked)")
        return 1
    label = "AUDIT PASS" if args.audit else "PASS"
    print(f"\nRELEASE GATE {label} ({passed}/{total})")
    return 0


def _git_commit() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


if __name__ == "__main__":
    raise SystemExit(main())
