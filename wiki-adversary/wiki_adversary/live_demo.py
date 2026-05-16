"""Long-running demo loop: ingest source once, then repeat rounds forever.

Each round:
  1. Generate N claims (mix of true and false) from the source via OpenAI.
  2. Query the cognee graph for evidence on each claim, classify TRUE/FALSE.
  3. Write claim+verdict to Redis so the Next.js UI sees it live.
  4. For misses, inject a correcting fact into the graph (self-improvement).
  5. Sleep briefly, increment round counter, loop.

Run with:
    python -m wiki_adversary.live_demo
"""

from __future__ import annotations

import asyncio
import json
import os
import signal
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from openai import AsyncOpenAI

import cognee
from cognee import SearchType

from . import redis_state
from .redis_state import ClaimState, RoundState

DATASET = "wiki-adversary"
DEFAULT_SOURCE = "data/sample_source.md"
CLAIMS_PER_ROUND = 5
ROUND_PAUSE_SECONDS = 4

_stop = asyncio.Event()


def _install_sigterm():
    def handler(*_):
        _stop.set()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, handler)


# --- Attacker -----------------------------------------------------------------

ATTACKER_PROMPT = """You are an adversarial fact-checker. Read the SOURCE and produce
exactly {n} short claims about it. Half must be TRUE (faithful to the source),
half must be FALSE in a plausible way: subtle substitution of names, numbers,
flags or relationships; near-paraphrase that flips meaning. Avoid claims that
aren't grounded in the source at all.

Return strict JSON: {{"claims": [{{"text": "...", "is_true": true|false}}, ...]}}.

SOURCE:
---
{source}
---"""


async def generate_attacks(client: AsyncOpenAI, source: str, n: int) -> list[dict]:
    resp = await client.chat.completions.create(
        model=os.environ.get("LLM_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        temperature=0.8,
        messages=[
            {"role": "system", "content": "You output strict JSON only."},
            {"role": "user", "content": ATTACKER_PROMPT.format(source=source, n=n)},
        ],
    )
    return json.loads(resp.choices[0].message.content)["claims"]


# --- Defender -----------------------------------------------------------------

JUDGE_PROMPT = """A claim must be judged TRUE or FALSE using only the WIKI EVIDENCE.

If the evidence supports the claim, answer TRUE. If the evidence contradicts the
claim, answer FALSE. If the evidence is silent on the claim, answer FALSE
(the wiki is the source of truth).

Return strict JSON: {{"verdict": "true"|"false", "rationale": "..."}}.

WIKI EVIDENCE:
---
{evidence}
---

CLAIM: {claim}"""


async def judge_claim(
    client: AsyncOpenAI, claim_text: str
) -> tuple[bool, str]:
    recall = await cognee.recall(
        f"Evidence for or against: {claim_text}",
        datasets=[DATASET],
        top_k=4,
    )
    evidence = "\n".join(getattr(r, "text", str(r)) for r in recall) or "(no evidence)"

    resp = await client.chat.completions.create(
        model=os.environ.get("LLM_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        temperature=0.0,
        messages=[
            {"role": "system", "content": "You output strict JSON only."},
            {
                "role": "user",
                "content": JUDGE_PROMPT.format(evidence=evidence, claim=claim_text),
            },
        ],
    )
    data = json.loads(resp.choices[0].message.content)
    verdict = str(data.get("verdict", "false")).lower() == "true"
    return verdict, data.get("rationale", "")


# --- Self-improve --------------------------------------------------------------


async def inject_correction(r, claim_text: str, was_true: bool) -> None:
    """Append a correcting fact to the wiki and log it for the UI."""
    correction = (
        f"Correction: the claim {claim_text!r} is "
        f"{'TRUE' if was_true else 'FALSE'} according to the source. "
        "Trust the source over plausible paraphrases."
    )
    await cognee.remember(correction, dataset_name=DATASET)
    await redis_state.record_addition(r, correction)


# --- Main loop -----------------------------------------------------------------


async def ingest_once(source_path: str) -> str:
    text = Path(source_path).read_text(encoding="utf-8")
    print(f"Ingesting {source_path} ({len(text)} bytes)...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    await cognee.remember(text, dataset_name=DATASET)
    return text


async def run_round(
    client: AsyncOpenAI,
    r,
    source: str,
    round_idx: int,
) -> None:
    await redis_state.set_status(r, "attacking")

    claims_raw = await generate_attacks(client, source, CLAIMS_PER_ROUND)
    claims = [
        ClaimState(id=f"r{round_idx}-{i}-{uuid4().hex[:4]}",
                   text=c["text"], truth=bool(c["is_true"]))
        for i, c in enumerate(claims_raw)
    ]

    # Publish "claims with no verdict yet" so the UI starts animating immediately.
    await redis_state.write_round(
        r,
        RoundState(index=round_idx, scorePct=0, status="judging", claims=claims),
    )
    for c in claims:
        await redis_state.push_attack(r, round_idx, {"text": c.text, "is_true": c.truth})

    correct = 0
    for i, c in enumerate(claims):
        verdict, rationale = await judge_claim(client, c.text)
        c.verdict = verdict
        c.rationale = rationale
        is_correct = verdict == c.truth
        if is_correct:
            correct += 1
        else:
            severity = 1.0 if (verdict and not c.truth) else 0.6
            await redis_state.record_vulnerability(r, c.text, severity)

        # Update incrementally so the UI sees each verdict land.
        await redis_state.write_round(
            r,
            RoundState(
                index=round_idx,
                scorePct=int(100 * correct / (i + 1)),
                status="judging",
                claims=claims,
            ),
        )

    await redis_state.set_status(r, "improving")
    # Inject corrections for misses → wiki gains new explicit facts.
    misses = [c for c in claims if c.verdict != c.truth]
    for c in misses:
        await inject_correction(r, c.text, c.truth)

    await redis_state.write_round(
        r,
        RoundState(
            index=round_idx,
            scorePct=int(100 * correct / len(claims)),
            status="done",
            claims=claims,
        ),
    )

    print(
        f"  round {round_idx}: {correct}/{len(claims)} correct "
        f"({len(misses)} corrections injected)"
    )


async def main_async(source_path: str) -> None:
    _install_sigterm()
    client = AsyncOpenAI(api_key=os.environ["LLM_API_KEY"])
    r = redis_state.get_client()

    try:
        await redis_state.reset(r)
        await redis_state.set_status(r, "ingesting")
        source = await ingest_once(source_path)
        await redis_state.set_status(r, "ready")

        round_idx = 0
        while not _stop.is_set():
            round_idx += 1
            try:
                await run_round(client, r, source, round_idx)
            except Exception as exc:
                print(f"  round {round_idx} failed: {exc!r}")
                await redis_state.set_status(r, f"error: {exc!r}")
            try:
                await asyncio.wait_for(_stop.wait(), timeout=ROUND_PAUSE_SECONDS)
            except asyncio.TimeoutError:
                pass
    finally:
        await redis_state.set_status(r, "stopped")
        await r.aclose()


def main() -> None:
    load_dotenv()
    source = os.environ.get("LIVE_SOURCE", DEFAULT_SOURCE)
    asyncio.run(main_async(source))


if __name__ == "__main__":
    main()
