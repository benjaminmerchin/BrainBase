"""Explicit Redis usage beyond Cognee's default session memory.

Two non-trivial patterns:
- Stream `attacks:pending` — pipeline of claims from Attacker to Defender.
- Sorted set `vulnerabilities` — score-ranked attacks that fooled the Defender;
  highest score = worst miss = where Lint should focus.
"""

from __future__ import annotations

import json
import os

import redis.asyncio as redis


def get_client() -> redis.Redis:
    return redis.from_url(
        os.environ.get("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True,
    )


ATTACKS_STREAM = "attacks:pending"
VULNERABILITIES_ZSET = "vulnerabilities"


async def push_attack(r: redis.Redis, round_id: str, claim: dict) -> str:
    return await r.xadd(
        ATTACKS_STREAM,
        {"round": round_id, "claim": json.dumps(claim)},
    )


async def drain_attacks(r: redis.Redis, round_id: str) -> list[dict]:
    """Read every pending attack for this round, then trim what we consumed."""
    entries = await r.xrange(ATTACKS_STREAM)
    claims: list[dict] = []
    consumed_ids: list[str] = []
    for entry_id, fields in entries:
        if fields.get("round") != round_id:
            continue
        claims.append(json.loads(fields["claim"]))
        consumed_ids.append(entry_id)
    if consumed_ids:
        await r.xdel(ATTACKS_STREAM, *consumed_ids)
    return claims


async def record_vulnerability(
    r: redis.Redis, claim_text: str, severity: float
) -> None:
    """Higher severity = worse miss. ZREVRANGE later picks worst-first."""
    await r.zadd(VULNERABILITIES_ZSET, {claim_text: severity})


async def top_vulnerabilities(r: redis.Redis, n: int = 5) -> list[tuple[str, float]]:
    raw = await r.zrevrange(VULNERABILITIES_ZSET, 0, n - 1, withscores=True)
    return [(text, float(score)) for text, score in raw]


async def reset(r: redis.Redis) -> None:
    await r.delete(ATTACKS_STREAM, VULNERABILITIES_ZSET)
