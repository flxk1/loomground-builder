#!/usr/bin/env python3
"""The M1-M3 Definition-of-Done gate for the meta-language core.

Run: ``python -m meta.gate`` from the repo root, inside the venv described in
meta/README.md (needs ``loomground-versum`` + ``loomground-governance``
importable).

For every (surface x tier) this asserts, using Versum's *own* validators
(never the generator's self-report):

  M1 - Valid emission:    NDSystem.validate() clean, GraphProjection.violations()
                           empty, adapter satisfies the SystemAdapter protocol.
  M2 - 5D fidelity:       every projected relation's dimension is one of the
                           five real Dimension values, local_predicate survives.
  M3 - Depth faithfulness: refinement (axes(fine) >= axes(normal) >= axes(coarse)),
                           resolution honesty (no emitted axis/relation-dimension
                           unsupported by the surface), determinism (stable
                           version hash; distinct surfaces hash distinctly).

Exits non-zero and prints a FAIL line (no partial credit) the moment any
invariant does not hold honestly -- per the task, weakening a check instead of
reporting the break is not an option.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from versum.adapters.protocol import SystemAdapter  # noqa: E402
from versum.dimensions import Dimension  # noqa: E402

from meta import generate, policy  # noqa: E402
from meta.surface import Surface  # noqa: E402

SURFACES_DIR = Path(__file__).resolve().parent / "surfaces"
TIERS = policy.TIERS

_assertions = 0
_failed = False


def ok(description: str) -> None:
    global _assertions
    _assertions += 1
    print(f"ok   {description}")


def fail(description: str) -> None:
    global _assertions, _failed
    _assertions += 1
    _failed = True
    print(f"FAIL {description}")


def require(condition: bool, description: str) -> None:
    if condition:
        ok(description)
    else:
        fail(description)


def load_surfaces() -> dict:
    return {p.stem: Surface.load(p) for p in sorted(SURFACES_DIR.glob("*.json"))}


# ── M1 / M2 : per (surface, tier) ───────────────────────────────────────────

def check_m1_m2(name: str, surface: Surface, tier: str):
    generated = generate(surface, tier)

    # M1a - NDSystem.validate() clean (Versum's own validator; raises on failure).
    try:
        generated.nd_system.validate()
        require(True, f"[{name}/{tier}] M1: NDSystem.validate() clean "
                      f"({len(generated.nd_system.axes)} axes)")
    except ValueError as exc:
        require(False, f"[{name}/{tier}] M1: NDSystem.validate() clean -- {exc}")

    # M1b - adapter satisfies the real SystemAdapter protocol (runtime_checkable).
    require(isinstance(generated.adapter, SystemAdapter),
           f"[{name}/{tier}] M1: adapter satisfies versum.adapters.protocol.SystemAdapter")

    # M1c - GraphProjection.violations() empty, via the adapter's own import_observation.
    projection = generated.adapter.import_observation(surface.canonical())
    violations = projection.violations()
    require(violations == [], f"[{name}/{tier}] M1: GraphProjection.violations() empty "
                              f"({len(projection.nodes)} nodes, {len(projection.relations)} "
                              f"relations, {len(projection.assignments)} assignments)"
                              + ("" if not violations else f" -- {violations}"))
    try:
        projection.validate()
        ok(f"[{name}/{tier}] M1: GraphProjection.validate() clean")
    except ValueError as exc:
        fail(f"[{name}/{tier}] M1: GraphProjection.validate() clean -- {exc}")

    # M2 - every relation lands on exactly one real Dimension, local_predicate survives.
    bad_dims = []
    missing_predicate = []
    for rel in projection.relations:
        try:
            Dimension(rel.dimension)
        except ValueError:
            bad_dims.append((rel.relation_id, rel.dimension))
        if not rel.local_predicate:
            missing_predicate.append(rel.relation_id)
    require(not bad_dims, f"[{name}/{tier}] M2: every relation dimension in "
                          f"{sorted(Dimension._value2member_map_.keys())} (never a 6th)"
                          + ("" if not bad_dims else f" -- bad: {bad_dims}"))
    require(not missing_predicate, f"[{name}/{tier}] M2: local_predicate present on every "
                                   f"relation (nothing discarded)"
                                   + ("" if not missing_predicate else f" -- {missing_predicate}"))
    dims_used = sorted({rel.dimension for rel in projection.relations})
    ok(f"[{name}/{tier}] M2: dimensions actually used this tier: {dims_used}")

    return generated, projection


# ── M3a: refinement / monotonicity ──────────────────────────────────────────

def check_refinement(name: str, surface: Surface, generated_by_tier: dict):
    axes_by_tier = {t: generated_by_tier[t].nd_system.axes for t in TIERS}
    ids_by_tier = {t: set(axes_by_tier[t].keys()) for t in TIERS}

    require(ids_by_tier["coarse"] <= ids_by_tier["normal"] <= ids_by_tier["fine"],
           f"[{name}] M3 refinement: axes(fine) >= axes(normal) >= axes(coarse) as ID sets "
           f"(coarse={sorted(ids_by_tier['coarse'])}, normal={sorted(ids_by_tier['normal'])}, "
           f"fine={sorted(ids_by_tier['fine'])})")

    # Every distinction a coarser tier makes, the finer tier also makes: for any
    # axis id shared between two tiers, vocabulary and primitives only grow.
    pairs = (("coarse", "normal"), ("normal", "fine"), ("coarse", "fine"))
    monotone = True
    detail = []
    for coarser, finer in pairs:
        shared = ids_by_tier[coarser] & ids_by_tier[finer]
        for axis_id in shared:
            c_axis, f_axis = axes_by_tier[coarser][axis_id], axes_by_tier[finer][axis_id]
            if not (set(c_axis.vocabulary) <= set(f_axis.vocabulary)):
                monotone = False
                detail.append(f"{axis_id}: vocabulary shrank {coarser}->{finer}")
            if not (set(c_axis.primitives) <= set(f_axis.primitives)):
                monotone = False
                detail.append(f"{axis_id}: primitives shrank {coarser}->{finer}")
    require(monotone, f"[{name}] M3 refinement: shared axes never lose a vocabulary/primitive "
                      f"distinction, finer tiers only add" + ("" if monotone else f" -- {detail}"))

    # Relation coverage is monotone too: every relation kind projected at a
    # coarser tier is still projected at the finer tier (structural + feeds
    # never disappear once earned).
    kinds_by_tier = {t: set(policy.relation_kinds_for_tier(surface, t)) | {"member_of_facade"}
                     for t in TIERS}
    require(kinds_by_tier["coarse"] <= kinds_by_tier["normal"] <= kinds_by_tier["fine"],
           f"[{name}] M3 refinement: projected relation kinds only grow across tiers "
           f"(coarse={sorted(kinds_by_tier['coarse'])}, normal={sorted(kinds_by_tier['normal'])}, "
           f"fine={sorted(kinds_by_tier['fine'])})")


# ── M3b: resolution honesty ─────────────────────────────────────────────────

def check_honesty(name: str, surface: Surface, generated_by_tier: dict):
    has_params = policy.has_params(surface)
    has_vocab = bool(policy.used_param_vocabulary_values(surface))
    present_kinds = set(policy.relation_kinds_present(surface))

    fine_axes = set(generated_by_tier["fine"].nd_system.axes.keys())
    if not has_params:
        require("op_param" not in fine_axes and "param_value_type" not in fine_axes,
               f"[{name}] M3 honesty: no params declared -> no op_param/param_value_type axis "
               f"emitted, even at fine")
    if not has_vocab:
        require("param_vocabulary" not in fine_axes,
               f"[{name}] M3 honesty: no param declares a vocabulary -> no param_vocabulary "
               f"axis emitted at fine (surface has none to report)")
    else:
        require("param_vocabulary" in fine_axes,
               f"[{name}] M3 honesty: at least one param declares a vocabulary -> "
               f"param_vocabulary axis IS emitted at fine (not under-modeled either)")

    for kind, dimension in sorted(surface_relation_kind_dimension().items()):
        if kind in present_kinds:
            continue
        # This surface never declares `kind` at all: assert it never appears as a
        # projected relation dimension-source at ANY tier for this surface.
        for tier in TIERS:
            projected = policy.relation_kinds_for_tier(surface, tier)
            require(kind not in projected,
                   f"[{name}/{tier}] M3 honesty: surface never declares {kind!r} -> "
                   f"never projected onto {dimension} (no invented axis/relation)")


def surface_relation_kind_dimension() -> dict:
    from meta.surface import RELATION_KIND_DIMENSION
    return RELATION_KIND_DIMENSION


# ── M3c: determinism ─────────────────────────────────────────────────────

def check_determinism(name: str, surface: Surface):
    for tier in TIERS:
        g1 = generate(surface, tier)
        g2 = generate(surface, tier)
        require(g1.nd_system.version == g2.nd_system.version,
               f"[{name}/{tier}] M3 determinism: same (object-type, tier) -> identical "
               f"NDSystem version hash ({g1.nd_system.version})")
        require(g1.mapping.version == g2.mapping.version,
               f"[{name}/{tier}] M3 determinism: same (object-type, tier) -> identical "
               f"SemanticMapping version hash ({g1.mapping.version})")


def check_determinism_cross_surface(surfaces: dict):
    for tier in TIERS:
        versions = {name: generate(surface, tier).nd_system.version
                   for name, surface in surfaces.items()}
        distinct = len(set(versions.values())) == len(versions)
        require(distinct, f"[*/{tier}] M3 determinism: distinct surfaces hash to distinct "
                          f"versions at the same tier {versions}")


def main() -> int:
    surfaces = load_surfaces()
    print(f"loaded surfaces: {sorted(surfaces)}\n")

    generated_by_surface: dict = {}
    for name, surface in surfaces.items():
        generated_by_surface[name] = {}
        for tier in TIERS:
            generated, _projection = check_m1_m2(name, surface, tier)
            generated_by_surface[name][tier] = generated
        print()

    for name, surface in surfaces.items():
        check_refinement(name, surface, generated_by_surface[name])
        check_honesty(name, surface, generated_by_surface[name])
        check_determinism(name, surface)
        print()

    check_determinism_cross_surface(surfaces)
    print()

    if _failed:
        print(f"GATE FAIL ({_assertions} assertions)")
        return 1
    print(f"GATE PASS ({_assertions} assertions)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
