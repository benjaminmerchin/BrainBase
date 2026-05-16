"""Orchestrates one adversarial round: ingest -> attack -> defend -> improve -> lint."""

from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import cognee
from cognee.memory import SkillRunEntry
from cognee.modules.memify.skill_improvement import improve_skill
from cognee.modules.pipelines.layers.resolve_authorized_user_datasets import (
    resolve_authorized_user_datasets,
)

from .attacker import generate_attacks
from .defender import judge_claim
from .judge import JudgeResult, round_score, score_one
from . import redis_layer

DATASET = "wiki-adversary"
DEFENDER_SKILL = "defender"


async def reset_world() -> None:
    """Wipe Cognee + Redis state. Useful for clean demo runs."""
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    r = redis_layer.get_client()
    try:
        await redis_layer.reset(r)
    finally:
        await r.aclose()


async def ingest_source(source_path: str) -> tuple[str, object, object]:
    """Ingest the source doc and the skills folder. Returns (source_text, user, dataset)."""
    source_text = Path(source_path).read_text(encoding="utf-8")

    await cognee.remember(
        source_text,
        dataset_name=DATASET,
        content_type="documents",
    )
    remembered = await cognee.remember(
        "./my_skills",
        dataset_name=DATASET,
        content_type="skills",
    )
    dataset_id = UUID(remembered.dataset_id)
    user, datasets = await resolve_authorized_user_datasets(dataset_id)
    return source_text, user, datasets[0]


async def run_round(
    source_text: str,
    user,
    dataset,
    round_idx: int,
    attacks_per_round: int = 5,
    improve_threshold: float = 0.9,
) -> tuple[float, list[JudgeResult]]:
    round_id = f"round-{round_idx}-{uuid4().hex[:6]}"
    r = redis_layer.get_client()

    try:
        # 1. Attacker writes to Redis stream.
        claims = await generate_attacks(source_text, n=attacks_per_round)
        for c in claims:
            await redis_layer.push_attack(r, round_id, c)

        # 2. Defender drains the stream and judges each claim.
        pending = await redis_layer.drain_attacks(r, round_id)
        results: list[JudgeResult] = []
        for claim in pending:
            verdict, raw = await judge_claim(claim["text"], DATASET, round_id)
            result = score_one(claim, verdict)
            results.append(result)

            if not result.correct:
                await redis_layer.record_vulnerability(
                    r, result.claim_text, result.severity
                )
                await _record_miss(round_id, result, raw, improve_threshold)
            else:
                # Reinforce: promote a permanent fact noting this verdict held.
                await cognee.remember(
                    f"Confirmed: '{claim['text']}' is "
                    f"{'true' if claim['is_true'] else 'false'} per the source.",
                    dataset_name=DATASET,
                )

        # 3. Apply any pending skill proposal (if score below threshold triggered one).
        await _apply_latest_proposal(user, dataset)
    finally:
        await r.aclose()

    return round_score(results), results


async def lint_round(top_n: int = 5) -> list[tuple[str, float]]:
    """Use the vulnerabilities ZSET to surface where the wiki is weakest.
    In a fuller impl this would dedupe / strengthen / split graph nodes.
    For now we surface the top-N misses so the writeup has concrete evidence."""
    r = redis_layer.get_client()
    try:
        return await redis_layer.top_vulnerabilities(r, n=top_n)
    finally:
        await r.aclose()


async def _record_miss(
    round_id: str, result: JudgeResult, raw_answer: str, threshold: float
) -> None:
    await cognee.remember(
        SkillRunEntry(
            selected_skill_id=DEFENDER_SKILL,
            task_text=f"Judge claim: {result.claim_text}",
            result_summary=(
                f"Defender said {result.verdict}; truth was {result.ground_truth}. "
                f"Error: {result.error_type}. Raw: {raw_answer[:200]}"
            ),
            success_score=0.0,
            feedback=-1.0,
        ),
        dataset_name=DATASET,
        session_id=round_id,
        skill_improvement={
            "skill_name": DEFENDER_SKILL,
            "apply": False,
            "score_threshold": threshold,
        },
    )


async def _apply_latest_proposal(user, dataset) -> str | None:
    """Find the most recent skill_improvement_proposal for the defender skill
    and apply it. Returns the proposal id if applied, else None."""
    # Cognee surfaces proposals on the dataset; we read them back and apply.
    # If the API surface evolves, this is the spot to adjust.
    try:
        await improve_skill(
            DEFENDER_SKILL,
            dataset=dataset,
            user=user,
            apply=True,
        )
        return DEFENDER_SKILL
    except Exception:
        # No proposal pending — nothing to apply this round.
        return None
