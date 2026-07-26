"""The meta-language's input format: a machine-readable object surface.

A surface describes an object-type as a set of operations, each declaring its
owning facade, its typed parameters, its mutation class, and its declared
relationships to other operations. This is deliberately small — it captures
exactly what §4 of the spec needs to pick axes and project relations, nothing
more (no execution semantics, no instance data).

Kept dependency-free (stdlib only) so it can be loaded before ``versum`` is on
sys.path.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

# Closed vocabularies for the surface format itself (not the generated nD
# system's vocabularies -- these constrain what a surface is allowed to say).
MUTATION_CLASSES = ("read", "write", "destructive")

# Every relation "kind" a surface may declare, and the *single* Federation-5D
# dimension it always projects onto at the "fine" tier. Structural membership
# (op -> facade) is derived by the generator itself, not declared by surfaces.
RELATION_KIND_DIMENSION = {
    "feeds": "causal",
    "precedes": "temporal",
    "grants": "intentional",
    "sibling": "relational",
}


class SurfaceError(ValueError):
    """Raised when a surface fails structural checks before it ever reaches Versum."""


@dataclass(frozen=True)
class Param:
    name: str
    type: str
    cardinality: str = "one"
    vocabulary: tuple = ()

    @classmethod
    def from_dict(cls, raw: dict) -> "Param":
        return cls(
            name=str(raw["name"]),
            type=str(raw["type"]),
            cardinality=str(raw.get("cardinality", "one")),
            vocabulary=tuple(raw.get("vocabulary", ())),
        )

    def canonical(self) -> dict:
        return {"name": self.name, "type": self.type, "cardinality": self.cardinality,
                "vocabulary": sorted(self.vocabulary)}


@dataclass(frozen=True)
class Relation:
    to: str
    kind: str

    @classmethod
    def from_dict(cls, raw: dict) -> "Relation":
        return cls(to=str(raw["to"]), kind=str(raw["kind"]))

    def canonical(self) -> dict:
        return {"to": self.to, "kind": self.kind}


@dataclass(frozen=True)
class Op:
    facade: str
    name: str
    params: tuple = ()
    mutates: str = "read"
    relations: tuple = ()

    @classmethod
    def from_dict(cls, raw: dict) -> "Op":
        return cls(
            facade=str(raw["facade"]),
            name=str(raw["name"]),
            params=tuple(Param.from_dict(p) for p in raw.get("params", ())),
            mutates=str(raw.get("mutates", "read")),
            relations=tuple(Relation.from_dict(r) for r in raw.get("relations", ())),
        )

    def canonical(self) -> dict:
        return {
            "facade": self.facade,
            "name": self.name,
            "params": [p.canonical() for p in self.params],
            "mutates": self.mutates,
            "relations": sorted((r.canonical() for r in self.relations),
                                key=lambda r: (r["to"], r["kind"])),
        }


@dataclass(frozen=True)
class Surface:
    object_type: str
    ops: tuple = ()

    @classmethod
    def from_dict(cls, raw: dict) -> "Surface":
        surface = cls(
            object_type=str(raw["object_type"]),
            ops=tuple(Op.from_dict(o) for o in raw.get("ops", ())),
        )
        surface.validate()
        return surface

    @classmethod
    def load(cls, path) -> "Surface":
        return cls.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))

    def validate(self) -> None:
        errors = []
        if not self.object_type:
            errors.append("surface requires object_type")
        if not self.ops:
            errors.append("surface requires at least one op")
        names = [op.name for op in self.ops]
        if len(names) != len(set(names)):
            errors.append("op names must be unique within a surface")
        op_names = set(names)
        for op in self.ops:
            if op.mutates not in MUTATION_CLASSES:
                errors.append(f"op {op.name!r}: unknown mutation class {op.mutates!r}")
            for rel in op.relations:
                if rel.kind not in RELATION_KIND_DIMENSION:
                    errors.append(f"op {op.name!r}: unknown relation kind {rel.kind!r}")
                if rel.to not in op_names:
                    errors.append(f"op {op.name!r}: relation target {rel.to!r} is not an op "
                                  f"in this surface")
        if errors:
            raise SurfaceError("; ".join(errors))

    def facades(self) -> tuple:
        return tuple(sorted({op.facade for op in self.ops}))

    def canonical(self) -> dict:
        """A fully deterministic, order-independent shape used for hashing/versioning."""
        return {
            "object_type": self.object_type,
            "ops": sorted((op.canonical() for op in self.ops), key=lambda o: o["name"]),
        }
