"""Scoped M4 writer/read lens backed by Versum's real graph persistence APIs."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from loomground_ingest.types import Subgraph
from versum.nd import load_assignments, save_assignments
from versum.store import graph


class MetaVersumStore:
    """Write one generated surface subgraph into a Versum-format store.

    This is deliberately local to the builder: Ingest's general-purpose
    ``versum_writer`` remains an explicitly unbuilt cross-repository seam.
    """

    def __init__(self, root) -> None:
        self.root = Path(root)
        self.versum_dir = self.root / ".versum"
        self.concepts_path = self.versum_dir / "concepts.csv"
        self.edges_path = self.versum_dir / "semantic_edges.csv"
        self.provenance_path = self.versum_dir / "meta-provenance.json"
        self.assignments_path = self.versum_dir / "nd" / "assignments.csv"
        self.systems_path = self.versum_dir / "nd" / "systems.json"

    def write(self, subgraph: Subgraph) -> dict[str, Any]:
        if subgraph.quarantined:
            return {
                "written": False,
                "reason": "quarantined",
                "dimension": subgraph.dimension,
            }
        if subgraph.dimension != "5D":
            raise ValueError(f"meta surface subgraph must use Ingest facet '5D', "
                             f"got {subgraph.dimension!r}")

        edge_errors = graph.check_edge_contracts(subgraph.edges)
        if edge_errors:
            raise ValueError("invalid Versum edge rows: " + "; ".join(edge_errors))

        concepts = []
        for node in subgraph.nodes:
            concepts.append(graph.Concept(
                concept_id=node["concept_id"],
                label=node.get("label", ""),
                domain="meta-surface",
                definition=json.dumps({
                    "node_type": node.get("node_type", ""),
                    "attributes": node.get("attributes", {}),
                    "source_ref": node.get("source_ref", ""),
                }, sort_keys=True, separators=(",", ":")),
                catalogue_version=subgraph.provenance.get("system_version", ""),
                created_by=subgraph.provenance.get("adapter_id", ""),
            ))
        identity_errors = graph.check_concept_ids_own_identity(concepts)
        if identity_errors:
            raise ValueError("invalid Versum node rows: " + "; ".join(identity_errors))
        orphan_errors = graph.check_no_orphan_edges([], concepts, subgraph.edges)
        if orphan_errors:
            raise ValueError("orphaned Versum edge rows: " + "; ".join(orphan_errors))

        self.versum_dir.mkdir(parents=True, exist_ok=True)
        graph.save_concepts(self.concepts_path, concepts)
        graph.save_edges(self.edges_path, subgraph.edges)
        save_assignments(self.assignments_path,
                         subgraph.provenance.get("nd_assignments", []))
        self.systems_path.write_text(
            json.dumps(subgraph.provenance.get("nd_systems", []),
                       indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        metadata = {
            key: value for key, value in subgraph.provenance.items()
            if key not in {"nd_assignments", "nd_systems"}
        }
        self.provenance_path.write_text(
            json.dumps(metadata, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        return {
            "written": True,
            "dimension": subgraph.dimension,
            "nodes": len(concepts),
            "edges": len(subgraph.edges),
        }

    def read(self) -> Subgraph:
        """Read back only through Versum's public graph loaders."""
        concepts = graph.load_concepts(self.concepts_path)
        edges = graph.load_edges(self.edges_path)
        provenance = json.loads(self.provenance_path.read_text(encoding="utf-8"))
        provenance["nd_systems"] = json.loads(
            self.systems_path.read_text(encoding="utf-8"))
        provenance["nd_assignments"] = load_assignments(self.assignments_path)
        nodes = []
        for concept in concepts:
            definition = json.loads(concept.get("definition") or "{}")
            nodes.append({
                "concept_id": concept["concept_id"],
                "label": concept.get("label", ""),
                "node_type": definition.get("node_type", ""),
                "attributes": definition.get("attributes", {}),
                "source_ref": definition.get("source_ref", ""),
            })
        return Subgraph(
            dimension="5D",
            nodes=nodes,
            edges=edges,
            provenance=provenance,
        )
