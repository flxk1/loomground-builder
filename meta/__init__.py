"""The meta-language core (M1-M3): (surface, tier) -> {NDSystem, SemanticMapping,
SystemAdapter}, generated against Versum's real contracts.

The public contracts in this package define the meta-language boundary used by
the ingest, solver, and render gates.
"""
from .adapter import GeneratedLanguage, MetaAdapter, generate
from .surface import Op, Param, Relation, Surface, SurfaceError

__all__ = [
    "GeneratedLanguage", "MetaAdapter", "generate",
    "Op", "Param", "Relation", "Surface", "SurfaceError",
]
