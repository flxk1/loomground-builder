#!/usr/bin/env python3
"""M4/M7 gate: real Ingest Subgraph -> Versum store -> Versum read-back."""
from __future__ import annotations

import copy
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from versum.dimensions import Dimension  # noqa: E402
from versum.nd import save_assignments  # noqa: E402
from versum.store import graph  # noqa: E402

from meta import policy  # noqa: E402
from meta.adapter import generate  # noqa: E402
from meta.ingest import encode_surface  # noqa: E402
from meta.store import MetaVersumStore  # noqa: E402
from meta.surface import Surface  # noqa: E402

SURFACES_DIR = Path(__file__).resolve().parent / "surfaces"
EDGE_FIELDS = (
    "edge_id", "src_id", "dst_id", "edge_type", "edge_family", "dimension",
    "semantic_role", "local_predicate", "system_id", "system_version", "source_ref",
)

_assertions = 0
_failed = False


def require(condition: bool, description: str) -> None:
    global _assertions, _failed
    _assertions += 1
    if condition:
        print(f"ok   {description}")
    else:
        _failed = True
        print(f"FAIL {description}")


def normalized_nodes(subgraph) -> set:
    return {
        (
            node["concept_id"], node.get("label", ""), node.get("node_type", ""),
            repr(sorted(node.get("attributes", {}).items())), node.get("source_ref", ""),
        )
        for node in subgraph.nodes
    }


def normalized_edges(subgraph) -> set:
    return {
        tuple((edge.get(field) or "") for field in EDGE_FIELDS)
        for edge in subgraph.edges
    }


def normalized_assignments(subgraph) -> set:
    return {
        (
            row.get("assignment_id", ""), row.get("subject_id", ""),
            row.get("system_id", ""), row.get("system_version", ""),
            row.get("axis_id", ""), repr(row.get("value")),
            row.get("source_id", ""), row.get("method", ""),
            row.get("confidence", ""), row.get("verification", ""),
        )
        for row in subgraph.provenance.get("nd_assignments", [])
    }


def intact(expected, actual) -> bool:
    return (
        actual.dimension == expected.dimension
        and actual.provenance == expected.provenance
        and normalized_nodes(actual) == normalized_nodes(expected)
        and normalized_edges(actual) == normalized_edges(expected)
        and normalized_assignments(actual) == normalized_assignments(expected)
    )


def load_surfaces() -> dict[str, Surface]:
    return {path.stem: Surface.load(path) for path in sorted(SURFACES_DIR.glob("*.json"))}


def check_round_trips(surfaces: dict[str, Surface]) -> None:
    edge_counts: dict[str, dict[str, int]] = {}
    assignment_counts: dict[str, dict[str, int]] = {}
    for name, surface in surfaces.items():
        edge_counts[name] = {}
        assignment_counts[name] = {}
        for tier in policy.TIERS:
            adapter = generate(surface, tier).adapter
            parsed = adapter.parse(json.dumps(surface.canonical()))
            parsed_projection = adapter.project(parsed)
            require(not parsed_projection.violations(),
                    f"[{name}/{tier}] M4: parser -> validator -> projector instance path is clean")
            expected = encode_surface(surface, tier)
            require(not expected.quarantined,
                    f"[{name}/{tier}] M4: honestly modeled surface is not quarantined")
            require(expected.dimension == "5D",
                    f"[{name}/{tier}] M4: Ingest whole-facet tag is '5D'")
            with tempfile.TemporaryDirectory(prefix="loomground-meta-m4-") as root:
                store = MetaVersumStore(root)
                result = store.write(expected)
                require(result["written"],
                        f"[{name}/{tier}] M4: Versum store accepted the subgraph")
                actual = store.read()
                require(intact(expected, actual),
                        f"[{name}/{tier}] M4: Versum read-back preserves every node, edge, "
                        "dimension, local predicate, nD assignment, and provenance field")
                require(all(edge["dimension"] in Dimension._value2member_map_
                            for edge in actual.edges),
                        f"[{name}/{tier}] M4: read-back dimensions remain Federation-5D values")

                # Teeth: corrupt the persisted authority, then prove comparison rejects it.
                rows = graph.load_edges(store.edges_path)
                dropped = copy.deepcopy(rows[:-1])
                graph.save_edges(store.edges_path, dropped)
                require(not intact(expected, store.read()),
                        f"[{name}/{tier}] M4 teeth: dropped stored edge is detected")
                graph.save_edges(store.edges_path, rows)
                corrupted = copy.deepcopy(rows)
                corrupted[0]["dimension"] = "invented-sixth"
                graph.save_edges(store.edges_path, corrupted)
                require(not intact(expected, store.read()),
                        f"[{name}/{tier}] M4 teeth: corrupted stored dimension is detected")
                graph.save_edges(store.edges_path, rows)
                assignments = copy.deepcopy(expected.provenance["nd_assignments"])
                save_assignments(store.assignments_path, assignments[:-1])
                require(not intact(expected, store.read()),
                        f"[{name}/{tier}] M4 teeth: dropped stored nD assignment is detected")

            edge_counts[name][tier] = len(expected.edges)
            assignment_counts[name][tier] = len(expected.provenance["nd_assignments"])

        counts = edge_counts[name]
        require(counts["coarse"] <= counts["normal"] <= counts["fine"],
                f"[{name}] M4 depth: stored edge granularity is monotone "
                f"{counts['coarse']} <= {counts['normal']} <= {counts['fine']}")
        assignments = assignment_counts[name]
        require(assignments["coarse"] <= assignments["normal"] <= assignments["fine"],
                f"[{name}] M4 depth: stored nD assignment granularity is monotone "
                f"{assignments['coarse']} <= {assignments['normal']} <= "
                f"{assignments['fine']}")

    require(any(c["coarse"] < c["fine"] for c in edge_counts.values()),
            "M4 depth: at least one relation-rich surface has strictly more fine edges")
    require(all(c["coarse"] < c["fine"] for c in assignment_counts.values()),
            "M4 depth: every parameterized surface has strictly more fine nD assignments")


def check_fail_closed() -> None:
    unsupported = Surface.from_dict({
        "object_type": "unsupported-instance",
        "ops": [{
            "facade": "bad",
            "name": "measure",
            "mutates": "read",
            "params": [{"name": "value", "type": "imaginary-number"}],
        }],
    })
    quarantined = encode_surface(unsupported, "fine")
    require(quarantined.quarantined,
            "M7: unsupported requested detail produces a quarantined Subgraph")
    require(not quarantined.nodes and not quarantined.edges,
            "M7: quarantine contains no fabricated nodes or edges")
    with tempfile.TemporaryDirectory(prefix="loomground-meta-m7-") as root:
        store = MetaVersumStore(root)
        result = store.write(quarantined)
        require(not result["written"] and result["reason"] == "quarantined",
                "M7: writer refuses the quarantined Subgraph")
        require(not store.versum_dir.exists(),
                "M7: refusal creates no Versum store files")


def main() -> int:
    surfaces = load_surfaces()
    print(f"loaded surfaces: {sorted(surfaces)}\n")
    check_round_trips(surfaces)
    check_fail_closed()
    print()
    if _failed:
        print(f"M4 GATE FAIL ({_assertions} assertions)")
        return 1
    print(f"M4 GATE PASS ({_assertions} assertions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
