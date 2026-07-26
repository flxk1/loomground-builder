"""The depth-tier policy: (surface, tier) -> NDSystem/SemanticMapping raw dicts
and the GraphProjection they license.

This is the one place tier semantics live, so refinement/honesty/determinism
(M3) can be checked against a single, auditable policy rather than scattered
generation code. Everything here is a pure function of ``(surface, tier)`` --
no state, no I/O -- which is what makes determinism (M3) checkable at all.

Tier policy (mirrors meta-language-spec.md §4):
  coarse -- op->facade membership (structural relation) + mutation-class axis.
            Only the coarsest relation (facade membership) is projected.
  normal -- coarse PLUS an op_param structural axis (param-of-op membership),
            PLUS op-feeds-op relations projected onto the causal dimension,
            PLUS the mutation-class axis refined with an ontology fact
            (destructive `contains` write, when the surface has both).
  fine   -- normal PLUS per-param typing axes (value_type, cardinality, and a
            vocabulary axis when at least one param declares one), PLUS every
            remaining relation kind the surface declares, each projected onto
            its fixed dimension (precedes->temporal, grants->intentional,
            sibling->relational).

Resolution honesty is structural to this module: every axis/relation builder
below is gated on "does the surface actually contain this," not on the tier
alone. A tier is a ceiling on detail, never a promise to invent it.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from .surface import RELATION_KIND_DIMENSION, Surface

TIERS = ("coarse", "normal", "fine")

# Versum's own AxisSpec._VALUE_TYPES (nd.py). Duplicated here only as an
# input-validation guard at the surface boundary -- fail closed before ever
# building an NDSystem, rather than let Versum's validator discover it later.
_VALUE_TYPES = frozenset({
    "string", "controlled_identifier", "concept_reference", "entity_reference",
    "integer", "non_negative_integer", "number", "boolean", "date", "interval",
    "quantity",
})

_RELATION_ROLE = {
    "member_of_facade": "belongs_to",
    "feeds": "produces_input_for",
    "precedes": "orders_before",
    "grants": "authorizes",
    "sibling": "co_member_of",
}


class PolicyError(ValueError):
    """Raised when a surface cannot be honestly modeled (fail closed, never fake)."""


def _digest(value) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"),
                         ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _id(prefix: str, *parts) -> str:
    return f"{prefix}:{_digest(list(parts))[:16]}"


def check_tier(tier: str) -> None:
    if tier not in TIERS:
        raise PolicyError(f"unknown tier {tier!r}; must be one of {TIERS}")


def check_surface_types(surface: Surface) -> None:
    """Fail closed on a param type Versum's own NDSystem could never accept."""
    bad = sorted({p.type for op in surface.ops for p in op.params} - _VALUE_TYPES)
    if bad:
        raise PolicyError(f"surface {surface.object_type!r} declares unsupported param "
                          f"type(s) {bad!r}; not in Versum's AxisSpec value_type vocabulary")


# ── surface introspection (what the surface actually supports) ─────────────

def used_mutation_classes(surface: Surface) -> tuple:
    return tuple(sorted({op.mutates for op in surface.ops}))


def has_params(surface: Surface) -> bool:
    return any(op.params for op in surface.ops)


def used_param_types(surface: Surface) -> tuple:
    return tuple(sorted({p.type for op in surface.ops for p in op.params}))


def used_param_cardinalities(surface: Surface) -> tuple:
    return tuple(sorted({p.cardinality for op in surface.ops for p in op.params}))


def used_param_vocabulary_values(surface: Surface) -> tuple:
    return tuple(sorted({v for op in surface.ops for p in op.params for v in p.vocabulary}))


def relation_kinds_present(surface: Surface) -> tuple:
    return tuple(sorted({r.kind for op in surface.ops for r in op.relations}))


def relation_kinds_for_tier(surface: Surface, tier: str) -> tuple:
    """The relation kinds (beyond the always-on structural facade membership)
    this tier is allowed to project for this surface -- the honesty gate for
    relations. Never returns a kind the surface doesn't declare."""
    present = set(relation_kinds_present(surface))
    if tier == "coarse":
        allowed = set()
    elif tier == "normal":
        allowed = {"feeds"}
    else:  # fine
        allowed = {"feeds", "precedes", "grants", "sibling"}
    return tuple(sorted(present & allowed))


# ── axis construction (what the tier + surface together license) ──────────

def axes_for_tier(surface: Surface, tier: str) -> dict:
    """Return the raw axes dict (axis_id -> AxisSpec.from_dict payload)."""
    check_tier(tier)
    axes: dict = {}

    facades = surface.facades()
    axes["op_facade"] = {
        "value_type": "controlled_identifier", "cardinality": "one",
        "vocabulary_mode": "closed", "vocabulary": list(facades),
        "primitives": ["equal"], "provenance_required": True,
    }

    used_mutations = list(used_mutation_classes(surface))
    mutation_primitives = ["equal"]
    if tier in ("normal", "fine"):
        mutation_primitives = ["equal", "contains", "contained_by"]
    axes["mutation_class"] = {
        "value_type": "controlled_identifier", "cardinality": "one",
        "vocabulary_mode": "closed", "vocabulary": used_mutations,
        "primitives": mutation_primitives, "provenance_required": True,
    }

    if tier in ("normal", "fine") and has_params(surface):
        param_ids = sorted(f"{op.name}.{p.name}" for op in surface.ops for p in op.params)
        axes["op_param"] = {
            "value_type": "string", "cardinality": "many",
            "vocabulary_mode": "closed", "vocabulary": param_ids,
            "primitives": ["equal"], "provenance_required": True,
        }

    if tier == "fine" and has_params(surface):
        axes["param_value_type"] = {
            "value_type": "controlled_identifier", "cardinality": "one",
            "vocabulary_mode": "closed", "vocabulary": list(used_param_types(surface)),
            "primitives": ["equal"], "provenance_required": True,
        }
        axes["param_cardinality"] = {
            "value_type": "controlled_identifier", "cardinality": "one",
            "vocabulary_mode": "closed", "vocabulary": list(used_param_cardinalities(surface)),
            "primitives": ["equal"], "provenance_required": True,
        }
        vocab_values = used_param_vocabulary_values(surface)
        if vocab_values:
            axes["param_vocabulary"] = {
                "value_type": "controlled_identifier", "cardinality": "many",
                "vocabulary_mode": "closed", "vocabulary": list(vocab_values),
                "primitives": ["equal"], "provenance_required": True,
            }

    return axes


def ontology_relations_for_tier(surface: Surface, tier: str) -> tuple:
    """The one ontology fact this policy states: destructive implies write --
    stated only when the surface actually has both classes (honesty), and
    only from `normal` on (mutation_class's `contains` refinement)."""
    if tier == "coarse":
        return ()
    used = set(used_mutation_classes(surface))
    if {"destructive", "write"} <= used:
        return ({"axis": "mutation_class", "left": "destructive", "right": "write",
                 "relation": "contains"},)
    return ()


def version_seed(surface: Surface, tier: str) -> dict:
    return {"object_type": surface.object_type, "tier": tier, "surface": surface.canonical()}


def version_for(surface: Surface, tier: str) -> str:
    """Deterministic version hash keyed by (object-type signature, tier) --
    mirrors integrations/loomground/adapter.py's ladder-hash pattern."""
    return f"{tier}-{_digest(version_seed(surface, tier))[:12]}"


def build_nd_system_raw(surface: Surface, tier: str) -> dict:
    check_surface_types(surface)
    return {
        "id": f"meta-{surface.object_type}",
        "namespace": f"meta.{surface.object_type}",
        "version": version_for(surface, tier),
        "federation_5d_version": "1",
        "axes": axes_for_tier(surface, tier),
        "bindings": [],
        "ontology_relations": list(ontology_relations_for_tier(surface, tier)),
        "validation": {"unknown_values": "reject", "missing_coordinates": "preserve_unknown",
                       "provenance_required": True},
    }


def build_semantic_mapping_raw(surface: Surface, tier: str) -> dict:
    relations = {
        "member_of_facade": {"dimension": "structural", "semantic_role": _RELATION_ROLE[
            "member_of_facade"]},
    }
    for kind in relation_kinds_for_tier(surface, tier):
        relations[kind] = {"dimension": RELATION_KIND_DIMENSION[kind],
                           "semantic_role": _RELATION_ROLE[kind]}
    return {
        "id": f"meta-{surface.object_type}-mapping",
        "version": version_for(surface, tier),
        "relations": relations,
    }
