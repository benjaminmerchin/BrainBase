"""Defender — answers TRUE/FALSE against the Cognee knowledge graph.

Uses an AGENTIC_COMPLETION search bound to the `defender` skill. The skill
itself is rewritten by the self-improvement loop after each round.
"""

from __future__ import annotations

import json
import re

import cognee
from cognee import SearchType


async def judge_claim(
    claim_text: str, dataset_name: str, session_id: str
) -> tuple[bool, str]:
    """Returns (verdict, raw_answer). verdict=True means the Defender thinks
    the claim is supported by the source."""
    question = (
        "Is the following claim TRUE or FALSE according to the wiki? "
        "Return strict JSON: {\"verdict\": \"true\"|\"false\", \"rationale\": \"...\"}.\n\n"
        f"CLAIM: {claim_text}"
    )
    answer = await cognee.search(
        question,
        query_type=SearchType.AGENTIC_COMPLETION,
        datasets=dataset_name,
        skills=["defender"],
        max_iter=4,
        session_id=session_id,
    )
    answer_text = answer if isinstance(answer, str) else str(answer)
    verdict = _extract_verdict(answer_text)
    return verdict, answer_text


def _extract_verdict(text: str) -> bool:
    """Pull a verdict out even if the agent wraps JSON in prose."""
    match = re.search(r'\{[^{}]*"verdict"\s*:\s*"(true|false)"', text, re.IGNORECASE)
    if match:
        return match.group(1).lower() == "true"
    # Fallback: if the agent just said "true" / "false" somewhere.
    if re.search(r"\btrue\b", text, re.IGNORECASE):
        return True
    return False
