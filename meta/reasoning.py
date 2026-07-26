"""Builder-owned composition of persisted Versum edges with neutral Solver.

Neither product imports the other here.  The builder is the host that reads
Versum's public store representation, lowers it to Solver's canonical
``reasoning.edges/v1`` schema, and submits the ordinary interoperability wire
record to the ordinary Solver service.
"""
from __future__ import annotations

import hashlib
import sys
from dataclasses import dataclass
from pathlib import Path

from loomground_ingest.types import Subgraph

_WORKSPACE = Path(__file__).resolve().parents[2]
for _dependency in ("loomground-solver", "loomground-deontic"):
    _src = _WORKSPACE / _dependency / "src"
    if str(_src) not in sys.path:
        sys.path.insert(0, str(_src))

from loomground_solver.service import default_service  # noqa: E402

SCHEMA = "reasoning.edges/v1"
SOLVER_VERSION = "0.1.0"


class ReasoningError(ValueError):
    """The stored graph or Solver result cannot support an honest build."""


@dataclass(frozen=True)
class BuildDecision:
    genre: str
    layout: str
    system_id: str
    system_version: str
    source_refs: tuple[str, ...]
    solver_signature: str


def _digest(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def _grounding(graph: Subgraph) -> tuple[str, str, tuple[str, ...]]:
    system_id = str(graph.provenance.get("system_id", "")).strip()
    version = str(graph.provenance.get("system_version", "")).strip()
    refs = tuple(sorted({
        str(edge.get("source_ref", "")).strip() for edge in graph.edges
        if str(edge.get("source_ref", "")).strip()
    }))
    if not system_id or not version or not refs:
        raise ReasoningError("stored graph lacks system identity, version, or source refs")
    for edge in graph.edges:
        if edge.get("system_id") != system_id or edge.get("system_version") != version:
            raise ReasoningError("stored edge identity/version does not match graph provenance")
        if edge.get("source_ref") not in refs:
            raise ReasoningError("stored edge has no grounded source ref")
    return system_id, version, refs


def _recommend(graph: Subgraph) -> tuple[str, str]:
    """Deterministic builder policy over graph facts, not a Solver plug-in."""
    non_membership = [
        edge for edge in graph.edges
        if edge.get("local_predicate") != "member_of_facade"
    ]
    dimensions = {str(edge.get("dimension", "")) for edge in non_membership}
    if {"causal", "temporal"} & dimensions:
        return "synth", "signal-flow"
    return "rack", "facade-rack"


def make_request(graph: Subgraph) -> tuple[dict, tuple[str, str]]:
    system_id, version, refs = _grounding(graph)
    genre, layout = _recommend(graph)
    neutral_edges = [{
        "subject": edge["src_id"],
        "predicate": edge["local_predicate"],
        "object": edge["dst_id"],
        "dimension": edge["dimension"],
        "source_ref": edge["source_ref"],
        "system_id": edge["system_id"],
        "system_version": edge["system_version"],
    } for edge in graph.edges]
    claims = (
        ("genre", genre, f"genre:{genre}"),
        ("layout", layout, f"layout:{layout}"),
    )
    candidates = []
    inline = []
    for kind, value, candidate_id in claims:
        text = f"{kind}={value}"
        source_id = f"{refs[0]}#{kind}"
        candidates.append({
            "candidate_id": candidate_id,
            "claim": text,
            "evidence": [{
                "source_id": source_id,
                "item_id": candidate_id,
                "content_digest": _digest(text),
                "graph_version": version,
            }],
            "structural_evidence": {"schema": SCHEMA, "edges": neutral_edges},
            "producer": "loomground-builder",
            "producer_version": "0.3.2",
        })
        inline.append({"source_id": source_id, "item_id": candidate_id, "content": text})
    return ({
        "protocol": "reasoning.interop",
        "protocol_version": "1.0",
        "kind": "reasoning_request",
        "request_id": f"builder:{system_id}:{version}",
        "problem": {
            "question": "Which typed genre and layout are grounded by this stored surface?",
            "system_id": system_id,
            "system_version": version,
            "source_refs": list(refs),
            "structural_schema": SCHEMA,
        },
        "candidates": candidates,
        "solver_profile": "generic",
        "required_capabilities": ["signed-replay"],
        "extensions": {
            "inline_evidence": inline,
        },
    }, (genre, layout))


def validate_result(request: dict, result: dict, expected: tuple[str, str]) -> BuildDecision:
    context = result.get("trace", {}).get("problem", {})
    wanted = request["problem"]
    if context != wanted:
        raise ReasoningError("Solver response is not bound to the requested graph version")
    if result.get("verifier") != "loomground-solver":
        raise ReasoningError("response is not from the real Solver service")
    if result.get("verifier_version") != SOLVER_VERSION:
        raise ReasoningError("Solver response version is incompatible")
    if not result.get("signature"):
        raise ReasoningError("Solver response has no signed replay evidence")
    accepted = set(result.get("accepted", ()))
    genre, layout = expected
    wanted_ids = {f"genre:{genre}", f"layout:{layout}"}
    if result.get("status") != "complete" or accepted != wanted_ids:
        raise ReasoningError("Solver did not accept exactly the grounded build decisions")
    evidence = result.get("trace", {}).get("evidence", ())
    if {row.get("candidate_id") for row in evidence} != wanted_ids:
        raise ReasoningError("Solver response lacks source receipts for every decision")
    fingerprint = result.get("trace", {}).get("fingerprint", {})
    logical = fingerprint.get("facets", {}).get("logical_form", {})
    if not logical or sum(logical.get("dimensions", {}).values()) < 1:
        raise ReasoningError("Solver response contains no typed structural reasoning")
    return BuildDecision(
        genre=genre,
        layout=layout,
        system_id=wanted["system_id"],
        system_version=wanted["system_version"],
        source_refs=tuple(wanted["source_refs"]),
        solver_signature=result["signature"],
    )


def reason(graph: Subgraph) -> tuple[BuildDecision, dict, dict]:
    request, expected = make_request(graph)
    result = default_service().verify(request)
    return validate_result(request, result, expected), request, result
