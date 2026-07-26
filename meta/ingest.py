"""M4 object-instance encoding into Ingest's neutral Subgraph contract."""
from __future__ import annotations

from dataclasses import asdict
import json

from loomground_ingest.types import Subgraph

from .adapter import generate
from .policy import PolicyError
from .surface import Surface


def _json_value(value):
    return json.loads(json.dumps(value, sort_keys=True))


def projection_to_subgraph(projection) -> Subgraph:
    """Lower a validated Versum projection without losing local predicates."""
    projection.validate()
    identity = projection.identity
    return Subgraph(
        dimension="5D",
        nodes=[
            {
                "concept_id": node.node_id,
                "label": node.label,
                "node_type": node.node_type,
                "attributes": node.attributes,
                "source_ref": node.source_ref,
            }
            for node in projection.nodes
        ],
        edges=projection.edge_rows(),
        provenance={
            "system_id": identity.system_id,
            "system_version": identity.version,
            "adapter_id": identity.adapter_id,
            "adapter_version": identity.adapter_version,
            "grammar_sha256": identity.grammar_sha256,
            "nd_systems": [_json_value(asdict(system)) for system in projection.nd_systems],
            "nd_assignments": [
                _json_value(asdict(assignment)) for assignment in projection.assignments
            ],
        },
    )


def encode_surface(surface: Surface, tier: str) -> Subgraph:
    """Encode at the requested tier, quarantining anything we cannot model honestly."""
    try:
        generated = generate(surface, tier)
        projection = generated.adapter.project(surface.canonical())
        return projection_to_subgraph(projection)
    except PolicyError as exc:
        return Subgraph(
            dimension="5D",
            provenance={
                "object_type": surface.object_type,
                "tier": tier,
                "quarantine_reason": str(exc),
            },
            quarantined=True,
        )
