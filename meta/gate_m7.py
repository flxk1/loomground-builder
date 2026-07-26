#!/usr/bin/env python3
"""M7: quarantine stops writes, Solver calls, builder selection and twin runs."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from meta.ingest import encode_surface  # noqa: E402
from meta.store import MetaVersumStore  # noqa: E402
from meta.surface import Surface, SurfaceError  # noqa: E402


def run_fail_closed(surface, tier, *, store, solver, builder, twin):
    subgraph = encode_surface(surface, tier)
    if subgraph.quarantined:
        return {"status": "quarantined", "reason": subgraph.provenance["quarantine_reason"]}
    result = store.write(subgraph)
    if not result["written"]:
        return {"status": "quarantined", "reason": result["reason"]}
    decision = solver(store.read())
    artifact = builder(decision)
    twin(artifact)
    return {"status": "complete"}


def run_raw_fail_closed(raw, tier, **seams):
    try:
        surface = Surface.from_dict(raw)
    except (KeyError, TypeError, ValueError, SurfaceError) as exc:
        return {"status": "quarantined", "reason": str(exc)}
    return run_fail_closed(surface, tier, **seams)


def main() -> int:
    calls = {"write": 0, "solver": 0, "builder": 0, "twin": 0}

    class Store:
        def __init__(self, root):
            self.real = MetaVersumStore(root)

        def write(self, value):
            calls["write"] += 1
            return self.real.write(value)

        def read(self):
            return self.real.read()

    cases = (
        {"object_type": "unmodellable",
         "ops": [{"facade": "x", "name": "x", "mutates": "read",
                  "params": [{"name": "x", "type": "imaginary-number"}]}]},
        {"object_type": "incomplete", "ops": []},
        {"object_type": "dangling",
         "ops": [{"facade": "x", "name": "x",
                  "relations": [{"kind": "feeds", "to": "absent"}]}]},
    )
    with tempfile.TemporaryDirectory(prefix="builder-m7-") as root:
        seams = {
            "store": Store(root),
            "solver": lambda _graph: calls.__setitem__("solver", calls["solver"] + 1),
            "builder": lambda _decision: calls.__setitem__("builder", calls["builder"] + 1),
            "twin": lambda _artifact: calls.__setitem__("twin", calls["twin"] + 1),
        }
        for raw in cases:
            result = run_raw_fail_closed(raw, "fine", **seams)
            if result["status"] != "quarantined" or any(calls.values()):
                print(f"M7 GATE FAIL: quarantine bypassed a seam: {calls}")
                return 1
        if (Path(root) / ".versum").exists():
            print("M7 GATE FAIL: quarantine created store files")
            return 1
    print("ok   unsupported detail, incomplete surface, and dangling relation are quarantined")
    print("ok   M7 teeth: quarantine bypass attempt made zero write/Solver/builder/twin calls")
    print("ok   quarantine created no Versum persistence")
    print("M7 GATE PASS (3 assertions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
