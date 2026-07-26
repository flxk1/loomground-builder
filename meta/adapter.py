"""MetaAdapter -- the generated SystemAdapter for one (surface, tier).

Clones the shape of versum's own reference adapter
(``versum/integrations/loomground/adapter.py``): identity is a content hash,
``nd_systems()`` returns one validated ``NDSystem``, and projection builds a
``GraphProjection`` out of typed ``ProjectedNode``/``ProjectedRelation``/
``CoordinateAssignment`` rows -- nothing here reimplements Versum's
validators; it only produces the inputs they check.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Any

from versum.adapters.intermediate import (
    AdapterCapabilities, ArtifactBundle, ExportResult, GraphProjection, ProjectedNode,
    ProjectedRelation, SystemIdentity,
)
from versum.adapters.mapping import SemanticMapping
from versum.nd import CoordinateAssignment, NDSystem

from . import policy
from .surface import Surface

ADAPTER_ID = "loomground-builder.meta-adapter"
ADAPTER_VERSION = "1"


def _digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"),
                         ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _id(prefix: str, *parts: Any) -> str:
    return f"{prefix}:{_digest(list(parts))[:16]}"


def _node_id(kind: str, value: str) -> str:
    """Return a Versum concept-compatible identity for a projected node."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        slug = _digest(value)[:12]
    return f"{kind}-{slug}-{_digest(value)[:8]}"


@dataclass(frozen=True)
class GeneratedLanguage:
    """The three compile-target artifacts §3 of the spec requires, plus the
    surface/tier that produced them (kept for the gate's introspection)."""
    surface: Surface
    tier: str
    nd_system: NDSystem
    mapping: SemanticMapping
    adapter: "MetaAdapter"


class MetaAdapter:
    """Implements versum.adapters.protocol.SystemAdapter for one generated
    ad-hoc language. One instance is scoped to one (surface, tier)."""

    def __init__(self, surface: Surface, tier: str, nd_system: NDSystem,
                mapping: SemanticMapping) -> None:
        self.surface = surface
        self.tier = tier
        self.nd_system = nd_system
        self.mapping = mapping

    # -- SystemAdapter protocol --------------------------------------------

    def identity(self) -> SystemIdentity:
        return SystemIdentity(
            system_id=self.nd_system.system_id,
            version=self.nd_system.version,
            grammar_sha256=_digest(self.surface.canonical()),
            adapter_id=ADAPTER_ID,
            adapter_version=ADAPTER_VERSION,
        )

    def capabilities(self) -> AdapterCapabilities:
        return AdapterCapabilities(
            artifacts=True,
            structural_projection=True,
            semantic_projection=True,
            parsing=True,
            export=False,
            runtime_observations=True,
        )

    def artifacts(self) -> ArtifactBundle:
        return ArtifactBundle(
            grammar=json.dumps(self.surface.canonical(), sort_keys=True, indent=2),
            schemas={"surface": {"object_type": "string", "ops": "list[op]"}},
            vocabularies={
                "mutation_class": list(policy.used_mutation_classes(self.surface)),
                "relation_kind": list(policy.relation_kinds_for_tier(self.surface, self.tier)),
                "facade": list(self.surface.facades()),
            },
            metadata={"mapping_id": self.mapping.mapping_id,
                     "mapping_version": self.mapping.version, "tier": self.tier},
        )

    def nd_systems(self) -> tuple:
        return (self.nd_system,)

    def parse(self, source: str) -> Any:
        if not isinstance(source, str):
            raise TypeError("MetaAdapter.parse expects a JSON string")
        try:
            return json.loads(source)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid surface JSON: {exc}") from exc

    def validate_program(self, program: Any) -> dict:
        try:
            candidate = _coerce_surface(program)
        except (KeyError, TypeError, ValueError) as exc:
            return {"valid": False, "errors": [str(exc)]}
        if candidate.canonical() != self.surface.canonical():
            return {
                "valid": False,
                "errors": ["surface instance does not match this generated language"],
            }
        return {"valid": True, "errors": []}

    def project(self, program: Any) -> GraphProjection:
        candidate = _coerce_surface(program)
        validation = self.validate_program(candidate)
        if not validation["valid"]:
            raise ValueError("; ".join(validation["errors"]))
        return build_projection(candidate, self.tier, self.nd_system, self.mapping,
                                self.identity()).validate()

    def import_observation(self, value: dict) -> GraphProjection:
        return self.project(value)

    def export(self, projection: GraphProjection) -> ExportResult:
        raise NotImplementedError("export is out of scope for M1-M3 (no render/twin wiring yet)")


def build_projection(surface: Surface, tier: str, nd_system: NDSystem,
                     mapping: SemanticMapping, identity: SystemIdentity) -> GraphProjection:
    source_ref = f"urn:meta:surface:{surface.object_type}:{tier}"
    method = f"{ADAPTER_ID}@{ADAPTER_VERSION}:{tier}"
    result = GraphProjection(identity=identity, nd_systems=[nd_system])

    def assign(subject_id: str, axis_id: str, value: Any) -> None:
        if axis_id not in nd_system.axes:
            return  # honesty: never assign to an axis this tier didn't emit
        result.assignments.append(CoordinateAssignment(
            assignment_id=_id("nda", subject_id, axis_id, value),
            subject_id=subject_id, system_id=nd_system.system_id,
            system_version=nd_system.version, axis_id=axis_id, value=value,
            source_id=source_ref, method=method, verification="attested",
        ))

    # Nodes: one per facade, one per op. Node existence is tier-independent --
    # what varies by tier is which axes/relations are asserted about them.
    for facade in surface.facades():
        result.nodes.append(ProjectedNode(_node_id("facade", facade), "facade", facade,
                                          source_ref=source_ref))
    for op in surface.ops:
        op_id = _node_id("op", op.name)
        result.nodes.append(ProjectedNode(op_id, "op", op.name,
                                          {"facade": op.facade, "mutates": op.mutates},
                                          source_ref))
        assign(op_id, "op_facade", op.facade)
        assign(op_id, "mutation_class", op.mutates)
        for param in op.params:
            assign(op_id, "op_param", f"{op.name}.{param.name}")
            param_id = f"param:{op.name}.{param.name}"
            assign(param_id, "param_value_type", param.type)
            assign(param_id, "param_cardinality", param.cardinality)
            for value in param.vocabulary:
                assign(param_id, "param_vocabulary", value)

        facade_mapping = mapping.relation("member_of_facade")
        result.relations.append(ProjectedRelation(
            _id("rel", op.name, "member_of_facade", op.facade), op_id,
            _node_id("facade", op.facade),
            facade_mapping.local_predicate, facade_mapping.dimension,
            facade_mapping.semantic_role, source_ref=source_ref,
        ))

        allowed_kinds = set(policy.relation_kinds_for_tier(surface, tier))
        for rel in op.relations:
            if rel.kind not in allowed_kinds:
                continue  # honesty: this tier doesn't project this relation kind yet
            rel_mapping = mapping.relation(rel.kind)
            target_id = _node_id("op", rel.to)
            result.relations.append(ProjectedRelation(
                _id("rel", op.name, rel.kind, rel.to), op_id, target_id,
                rel_mapping.local_predicate, rel_mapping.dimension,
                rel_mapping.semantic_role, source_ref=source_ref,
            ))

    return result


def _coerce_surface(program: Any) -> Surface:
    if isinstance(program, Surface):
        return program
    if isinstance(program, str):
        try:
            program = json.loads(program)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid surface JSON: {exc}") from exc
    if not isinstance(program, dict):
        raise TypeError("surface program must be a Surface, dict, or JSON string")
    return Surface.from_dict(program)


def generate(surface: Surface, tier: str) -> GeneratedLanguage:
    """(surface, tier) -> {NDSystem, SemanticMapping, SystemAdapter} -- the
    meta-language's one entry point (spec §3)."""
    policy.check_tier(tier)
    nd_system = NDSystem.from_dict(policy.build_nd_system_raw(surface, tier)).validate()
    mapping = SemanticMapping.from_dict(policy.build_semantic_mapping_raw(surface, tier))
    adapter = MetaAdapter(surface, tier, nd_system, mapping)
    return GeneratedLanguage(surface=surface, tier=tier, nd_system=nd_system,
                             mapping=mapping, adapter=adapter)
