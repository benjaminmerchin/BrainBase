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
DEFAULT_WIKI_SOURCE = "data/sample_source.md"  # seeds the wiki (contains errors)
DEFAULT_TRUTH_SOURCE = "data/source_truth.md"  # attacker's ground truth
CLAIMS_PER_ROUND = 5
ROUND_PAUSE_SECONDS = 4

_stop = asyncio.Event()


def _install_sigterm():
    def handler(*_):
        _stop.set()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, handler)


# --- Attacker -----------------------------------------------------------------

ATTACKER_PROMPT = """You are a fact-checker. The SOURCE below is the canonical TRUTH about a topic.
A separate "wiki" exists which is supposed to mirror the source but may
contain errors. Your job: generate exactly {n} short claims about the topic
that are FAITHFUL to the SOURCE, and a wiki-checker will judge them.

Roughly half of your claims should be TRUE (faithful to the source), half
FALSE (a SINGLE detail — number, identifier, version, function name, port,
unit — substituted relative to the source). Keep sentence structure clean
and natural. Vary the topics across claims.

Return strict JSON: {{"claims": [{{"text": "...", "is_true": true|false}}, ...]}}.

SOURCE (canonical truth):
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

JUDGE_PROMPT = """A claim must be judged TRUE or FALSE using ONLY the WIKI EVIDENCE below.

Do not use any outside knowledge. The wiki is what you have.

If the wiki contradicts the claim → answer FALSE.
If the wiki supports the claim → answer TRUE.
If the wiki is silent on the claim → answer FALSE.

IMPORTANT: if multiple wiki entries conflict, prefer the most recent or any
entry that starts with "Correction:" — those are authoritative updates.

Return strict JSON: {{"verdict": "true"|"false", "rationale": "..."}}.

WIKI EVIDENCE:
---
{evidence}
---

CLAIM: {claim}"""


async def judge_claim(
    client: AsyncOpenAI, claim_text: str
) -> tuple[bool, str]:
    # Use raw graph chunks (not GRAPH_COMPLETION) so the judge has to do the
    # actual reasoning instead of receiving a pre-baked answer.
    recall = await cognee.recall(
        claim_text,
        query_type=SearchType.CHUNKS,
        datasets=[DATASET],
        top_k=2,
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
    """Append an authoritative correction to the wiki and log it for the UI.

    The prefix "Correction:" matters: the JUDGE_PROMPT tells the LLM to
    prefer entries starting with this prefix when wiki entries conflict.
    """
    truth_word = "TRUE" if was_true else "FALSE"
    correction = (
        f"Correction (authoritative): the statement \"{claim_text}\" is "
        f"{truth_word}. The wiki had outdated or incorrect information about "
        "this; this entry supersedes any conflicting prior wiki content."
    )
    await cognee.remember(correction, dataset_name=DATASET)
    await redis_state.record_addition(r, correction)


# --- Main loop -----------------------------------------------------------------


async def ingest_once(wiki_path: str, truth_path: str) -> str:
    """Seed the wiki with the (corrupted) wiki source. Return the truth text
    for the Attacker to read."""
    wiki_text = Path(wiki_path).read_text(encoding="utf-8")
    truth_text = Path(truth_path).read_text(encoding="utf-8")
    print(f"Seeding wiki from {wiki_path} ({len(wiki_text)} bytes, has errors)...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    await cognee.remember(wiki_text, dataset_name=DATASET)
    print(f"Attacker will read from {truth_path} ({len(truth_text)} bytes, truth)")
    return truth_text


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


async def main_async(wiki_source: str, truth_source: str) -> None:
    _install_sigterm()
    client = AsyncOpenAI(api_key=os.environ["LLM_API_KEY"])
    r = redis_state.get_client()

    try:
        await redis_state.reset(r)
        await redis_state.set_status(r, "ingesting")
        source = await ingest_once(wiki_source, truth_source)
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
    wiki = os.environ.get("LIVE_WIKI_SOURCE", DEFAULT_WIKI_SOURCE)
    truth = os.environ.get("LIVE_TRUTH_SOURCE", DEFAULT_TRUTH_SOURCE)
    asyncio.run(main_async(wiki, truth))


if __name__ == "__main__":
    main()
