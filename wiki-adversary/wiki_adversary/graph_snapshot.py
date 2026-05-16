"""Render the cognee graph WITH a domain-specific schema overlay.

cognee.visualize() ships with two tabs (Graph + Schema). The Graph tab
renders fine from the live graph data. The Schema tab needs a JSON Schema
dict, which cognee will not synthesize on its own — so we hand-craft one
describing the Wiki Adversary domain (Attacker / Defender / Wiki / Claim /
Verdict / Correction / Round) and pass it through.
"""

from __future__ import annotations

from cognee.infrastructure.databases.graph import get_graph_engine
from cognee.modules.visualization.cognee_network_visualization import (
    cognee_network_visualization,
)


SCHEMA_DATA = {
    "title": "WikiAdversary",
    "description": "Adversarial self-hardening LLM wiki.",
    "properties": {
        "rounds": {
            "type": "array",
            "items": {"$ref": "#/$defs/Round"},
        },
        "wiki": {"$ref": "#/$defs/Wiki"},
    },
    "required": ["rounds", "wiki"],
    "$defs": {
        "Source": {
            "description": "Document used as ground truth or initial seed.",
            "type": "object",
            "properties": {
                "kind": {"type": "string"},
                "path": {"type": "string"},
                "bytes": {"type": "integer"},
            },
            "required": ["kind", "path"],
        },
        "Wiki": {
            "description": "Cognee knowledge graph, evolves over time.",
            "type": "object",
            "properties": {
                "seed": {"$ref": "#/$defs/Source"},
                "corrections": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/Correction"},
                },
                "entries": {"type": "integer"},
            },
            "required": ["seed"],
        },
        "Attacker": {
            "description": "LLM that emits true and false claims from the truth source.",
            "type": "object",
            "properties": {
                "reads_from": {"$ref": "#/$defs/Source"},
                "model": {"type": "string"},
                "emits": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/Claim"},
                },
            },
            "required": ["reads_from", "emits"],
        },
        "Defender": {
            "description": "LLM that judges claims against the wiki.",
            "type": "object",
            "properties": {
                "consults": {"$ref": "#/$defs/Wiki"},
                "model": {"type": "string"},
                "verdicts": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/Verdict"},
                },
            },
            "required": ["consults", "verdicts"],
        },
        "Claim": {
            "description": "A statement to be judged true or false.",
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "truth": {"type": "boolean"},
            },
            "required": ["text", "truth"],
        },
        "Verdict": {
            "description": "Defender's TRUE/FALSE judgment of a claim.",
            "type": "object",
            "properties": {
                "verdict": {"type": "boolean"},
                "rationale": {"type": "string"},
                "correct": {"type": "boolean"},
            },
            "required": ["verdict", "correct"],
        },
        "Correction": {
            "description": "Authoritative fact injected after a miss.",
            "type": "object",
            "properties": {
                "claim": {"type": "string"},
                "truth_value": {"type": "boolean"},
                "supersedes": {"type": "string"},
            },
            "required": ["claim", "truth_value"],
        },
        "Round": {
            "description": "One ingest → attack → judge → improve cycle.",
            "type": "object",
            "properties": {
                "index": {"type": "integer"},
                "score_pct": {"type": "integer"},
                "attacker": {"$ref": "#/$defs/Attacker"},
                "defender": {"$ref": "#/$defs/Defender"},
                "corrections_injected": {
                    "type": "array",
                    "items": {"$ref": "#/$defs/Correction"},
                },
            },
            "required": ["index", "attacker", "defender"],
        },
    },
}


async def render_graph_html() -> str:
    """Equivalent of cognee.visualize() but with our schema overlay."""
    engine = await get_graph_engine()
    graph_data = await engine.get_graph_data()
    return await cognee_network_visualization(
        graph_data,
        destination_file_path=None,
        schema_data=SCHEMA_DATA,
    )
