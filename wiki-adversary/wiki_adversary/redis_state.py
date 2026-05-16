"""Redis keys for the live demo.

Layout (so the Next.js route handler can read everything in one snapshot):

  state                       hash  {round, score_pct, total_correct, total_seen,
                                     started_at, last_updated, status}
  round:current               hash  {index, scorePct, status, claims_json}
  vulnerabilities             zset  claim_text -> severity (1.0 false-positive,
                                                            0.6 false-negative)
  wiki:additions              list  JSON strings of facts injected by the loop
                                    (LPUSH + LTRIM 50)
  attacks:pending             stream raw audit trail of generated claims
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass

import redis.asyncio as redis


def get_client() -> redis.Redis:
    return redis.from_url(
        os.environ.get("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True,
    )


@dataclass
class ClaimState:
    id: str
    text: str
    truth: bool
    verdict: bool | None = None
    rationale: str = ""


@dataclass
class RoundState:
    index: int
    scorePct: int
    status: str  # "ingesting" | "attacking" | "judging" | "improving" | "done"
    claims: list[ClaimState]


# --- writers (called by the Python loop) -------------------------------------


async def reset(r: redis.Redis) -> None:
    await r.delete(
        "state",
        "round:current",
        "vulnerabilities",
        "wiki:additions",
        "wiki:contents",
        "attacks:pending",
        "events:log",
        "graph:html",
    )


async def push_event(
    r: redis.Redis,
    kind: str,
    message: str,
    level: str = "info",
    extra: dict | None = None,
) -> None:
    """Append a pipeline event for the UI to display.

    kind:    ingest | round_start | attack | verdict | miss | correction |
             round_end | status | error
    level:   info | success | warn | error
    """
    entry = {
        "ts": time.time(),
        "kind": kind,
        "level": level,
        "message": message,
        "extra": extra or {},
    }
    await r.lpush("events:log", json.dumps(entry))
    await r.ltrim("events:log", 0, 499)


async def set_status(r: redis.Redis, status: str) -> None:
    await r.hset(
        "state",
        mapping={
            "status": status,
            "last_updated": str(time.time()),
        },
    )


async def write_round(r: redis.Redis, round_state: RoundState) -> None:
    payload = {
        "index": round_state.index,
        "scorePct": round_state.scorePct,
        "status": round_state.status,
        "claims": [asdict(c) for c in round_state.claims],
    }
    await r.set("round:current", json.dumps(payload))
    await r.hset(
        "state",
        mapping={
            "round": round_state.index,
            "score_pct": round_state.scorePct,
            "status": round_state.status,
            "last_updated": str(time.time()),
        },
    )


async def record_vulnerability(
    r: redis.Redis, claim_text: str, severity: float
) -> None:
    await r.zadd("vulnerabilities", {claim_text: severity})


async def record_addition(r: redis.Redis, fact_text: str) -> None:
    await r.lpush("wiki:additions", fact_text)
    await r.ltrim("wiki:additions", 0, 49)


# wiki:contents holds the current "what's in the wiki" snapshot — originals
# from the seeded source at the bottom, corrections at the top (LPUSH).
async def seed_wiki_contents(r: redis.Redis, facts: list[str]) -> None:
    await r.delete("wiki:contents")
    if facts:
        await r.rpush("wiki:contents", *facts)


async def push_wiki_fact(r: redis.Redis, fact: str) -> None:
    await r.lpush("wiki:contents", fact)
    await r.ltrim("wiki:contents", 0, 199)


async def set_graph_html(r: redis.Redis, html: str) -> None:
    """Persist the latest cognee.visualize() HTML snapshot so the UI iframe
    can fetch it without touching the filesystem."""
    await r.set("graph:html", html)


async def push_attack(r: redis.Redis, round_idx: int, claim: dict) -> None:
    await r.xadd(
        "attacks:pending",
        {"round": str(round_idx), "claim": json.dumps(claim)},
        maxlen=200,
        approximate=True,
    )
