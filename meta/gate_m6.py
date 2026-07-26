#!/usr/bin/env python3
"""M6: one notes object chain ending in the unchanged live twin witness."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from meta.ingest import encode_surface  # noqa: E402
from meta.reasoning import reason  # noqa: E402
from meta.store import MetaVersumStore  # noqa: E402
from meta.surface import Surface  # noqa: E402


def main() -> int:
    assertions = 0
    try:
        surface = Surface.load(ROOT / "meta" / "surfaces" / "notes.json")
        with tempfile.TemporaryDirectory(prefix="builder-m6-") as root:
            store = MetaVersumStore(root)
            written = store.write(encode_surface(surface, "fine"))
            assert written["written"]
            decision, request, _result = reason(store.read())
            assert (decision.genre, decision.layout) == ("rack", "facade-rack")
            assertions += 1
            print("ok   object -> generated language -> Ingest -> Versum -> Solver -> "
                  "builder decision is intact")

            twin = ROOT / "examples" / "notes" / "twin.html"
            html = twin.read_text(encoding="utf-8")
            expected_ops = {f"notes.{op.name}" for op in surface.ops}
            # The unchanged twin emits data-op dynamically from its catalogue;
            # compare the source catalogue here, then let the live witness prove
            # those rows become reachable DOM controls.
            missing = {op for op in expected_ops if f'name: "{op}"' not in html}
            assert not missing, f"selected twin dropped controls: {sorted(missing)}"
            assertions += 1
            print("ok   Solver-grounded builder decision selects a complete shipped twin")

            proc = subprocess.run(
                ["node", "testing/live/live-gate.mjs", "--all"],
                cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                env={**__import__("os").environ,
                     "TWIN_ADAPTER": "./adapters/notes.mjs"},
            )
            if proc.returncode or "SKIP:" in proc.stdout or "LIVE GATE PASS" not in proc.stdout:
                raise AssertionError("unchanged live witness failed:\n" + proc.stdout)
            assertions += 1
            print("ok   unchanged live witness passed against the selected twin")
            print(json.dumps({
                "request_id": request["request_id"],
                "genre": decision.genre,
                "layout": decision.layout,
                "solver_signature": decision.solver_signature,
            }, sort_keys=True))
    except Exception as exc:
        print(f"M6 GATE FAIL ({assertions} assertions): {type(exc).__name__}: {exc}")
        return 1
    print(f"M6 GATE PASS ({assertions} assertions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
