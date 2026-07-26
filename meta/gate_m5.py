#!/usr/bin/env python3
"""M5: persisted Versum graph -> neutral reasoning.edges/v1 -> real Solver."""
from __future__ import annotations

import copy
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from meta.adapter import generate  # noqa: E402
from meta.ingest import encode_surface  # noqa: E402
from meta.reasoning import ReasoningError, reason, validate_result  # noqa: E402
from meta.store import MetaVersumStore  # noqa: E402
from meta.surface import Surface  # noqa: E402

SURFACES = Path(__file__).resolve().parent / "surfaces"


def main() -> int:
    assertions = 0
    try:
        for path in sorted(SURFACES.glob("*.json")):
            surface = Surface.load(path)
            with tempfile.TemporaryDirectory(prefix="builder-m5-") as root:
                store = MetaVersumStore(root)
                assert store.write(encode_surface(surface, "fine"))["written"]
                stored = store.read()
                decision, request, result = reason(stored)
                assertions += 1
                print(f"ok   [{path.stem}] stored graph reached real Solver via "
                      f"reasoning.edges/v1 -> {decision.genre}/{decision.layout}")
                assert request["candidates"][0]["structural_evidence"]["edges"]
                assert result["trace"]["evidence"]
                assertions += 1
                print(f"ok   [{path.stem}] typed reasoning retains source receipts")

                tampered = copy.deepcopy(result)
                tampered["trace"]["problem"]["system_version"] += "-wrong"
                try:
                    validate_result(request, tampered, (decision.genre, decision.layout))
                except ReasoningError:
                    assertions += 1
                    print(f"ok   [{path.stem}] M5 teeth rejects wrong-version Solver evidence")
                else:
                    raise AssertionError("wrong-version Solver response was accepted")
    except Exception as exc:
        print(f"M5 GATE FAIL ({assertions} assertions): {type(exc).__name__}: {exc}")
        return 1
    print(f"M5 GATE PASS ({assertions} assertions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
