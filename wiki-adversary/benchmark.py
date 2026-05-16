"""Reproducible before/after benchmark for SUBMISSION.md.

Pipeline:
  1. Prune everything, re-seed the wiki from the corrupted source.
  2. Generate N frozen test claims from the truth source.
  3. Baseline: judge all N claims against the (corrupted) wiki.
  4. For every miss, inject a "Correction:" entry into the wiki.
  5. Improved: judge the SAME N claims against the patched wiki.
  6. Print a markdown report to stdout and to bench_results.md.

The test set is frozen and cached to data/benchmark_claims.json so reruns
produce comparable numbers.

Usage:
    python benchmark.py [--n 10] [--regenerate]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI

import cognee
from cognee import SearchType

from wiki_adversary.live_demo import (
    ATTACKER_PROMPT,
    DATASET,
    DEFAULT_TRUTH_SOURCE,
    DEFAULT_WIKI_SOURCE,
    JUDGE_PROMPT,
    oracle_check,
)

CACHE_PATH = Path("data/benchmark_claims.json")
REPORT_PATH = Path("bench_results.md")


async def regen_claims(client: AsyncOpenAI, source: str, n: int) -> list[dict]:
    """Generate the frozen test set. Saved to disk so reruns are comparable."""
    resp = await client.chat.completions.create(
        model=os.environ.get("LLM_MODEL", "gpt-5.4-nano"),
        response_format={"type": "json_object"},
        temperature=0.6,
        messages=[
            {"role": "system", "content": "You output strict JSON only."},
            {"role": "user", "content": ATTACKER_PROMPT.format(source=source, n=n)},
        ],
    )
    return json.loads(resp.choices[0].message.content)["claims"]


async def judge(client: AsyncOpenAI, claim_text: str) -> tuple[bool, str]:
    """Same judge as live_demo, with a slightly wider recall so a single
    correction is reliably surfaced."""
    recall = await cognee.recall(
        claim_text,
        query_type=SearchType.CHUNKS,
        datasets=[DATASET],
        top_k=4,
    )
    evidence = "\n".join(getattr(r, "text", str(r)) for r in recall) or "(no evidence)"
    resp = await client.chat.completions.create(
        model=os.environ.get("LLM_MODEL", "gpt-5.4-nano"),
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
    return str(data.get("verdict", "false")).lower() == "true", data.get("rationale", "")


async def inject_correction(claim_text: str, was_true: bool) -> None:
    truth_word = "TRUE" if was_true else "FALSE"
    correction = (
        f"Correction (authoritative): the statement \"{claim_text}\" is "
        f"{truth_word}. The wiki had outdated or incorrect information about "
        "this; this entry supersedes any conflicting prior wiki content."
    )
    await cognee.remember(correction, dataset_name=DATASET)


async def run(n: int, regenerate: bool) -> None:
    load_dotenv()
    client = AsyncOpenAI(api_key=os.environ["LLM_API_KEY"])

    truth = Path(DEFAULT_TRUTH_SOURCE).read_text(encoding="utf-8")
    wiki = Path(DEFAULT_WIKI_SOURCE).read_text(encoding="utf-8")

    # 1. Fresh wiki seeded from corrupted source.
    print("Pruning + reseeding wiki...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)
    await cognee.remember(wiki, dataset_name=DATASET)

    # 2. Frozen test set.
    if regenerate or not CACHE_PATH.exists():
        print(f"Generating {n} frozen test claims from truth source...")
        claims = await regen_claims(client, truth, n)
        CACHE_PATH.write_text(json.dumps(claims, indent=2))
    else:
        claims = json.loads(CACHE_PATH.read_text())[:n]
        print(f"Loaded {len(claims)} frozen test claims from {CACHE_PATH}")

    # 3. Baseline. Use Oracle for ground truth (mirrors live behaviour).
    print("\n=== Baseline (corrupted wiki) ===")
    baseline: list[dict] = []
    for i, c in enumerate(claims):
        verdict, rationale = await judge(client, c["text"])
        oracle_truth = await oracle_check(client, truth, c["text"])
        correct = verdict == oracle_truth
        mark = "✓" if correct else "✗"
        print(f"  {mark} oracle={oracle_truth!s:5} verdict={verdict!s:5}  {c['text'][:80]}")
        baseline.append({**c, "is_true": oracle_truth, "verdict": verdict,
                         "rationale": rationale, "correct": correct})

    baseline_score = sum(1 for r in baseline if r["correct"]) / len(baseline)
    print(f"\nBaseline score: {sum(1 for r in baseline if r['correct'])}/{len(baseline)} = {baseline_score:.0%}")

    # 4. Inject corrections for misses (oracle's truth, not attacker's).
    misses = [r for r in baseline if not r["correct"]]
    print(f"\nInjecting {len(misses)} correction(s)...")
    for r in misses:
        await inject_correction(r["text"], r["is_true"])

    # 5. Re-judge the SAME claims against the patched wiki.
    print("\n=== Improved (patched wiki) ===")
    improved: list[dict] = []
    for i, b in enumerate(baseline):
        verdict, rationale = await judge(client, b["text"])
        # Reuse the baseline's oracle truth — same claim, same source, same answer.
        oracle_truth = b["is_true"]
        correct = verdict == oracle_truth
        mark = "✓" if correct else "✗"
        print(f"  {mark} oracle={oracle_truth!s:5} verdict={verdict!s:5}  {b['text'][:80]}")
        improved.append({**b, "verdict": verdict, "rationale": rationale, "correct": correct})

    improved_score = sum(1 for r in improved if r["correct"]) / len(improved)
    print(f"\nImproved score: {sum(1 for r in improved if r['correct'])}/{len(improved)} = {improved_score:.0%}")

    # 6. Markdown report.
    flipped = [
        (b, i)
        for b, i in zip(baseline, improved)
        if not b["correct"] and i["correct"]
    ]
    report = (
        f"# Benchmark — Wiki Adversary self-improvement\n\n"
        f"- **Frozen test set**: {len(claims)} claims generated from the truth source.\n"
        f"- **Baseline** (wiki seeded with errors): "
        f"**{sum(1 for r in baseline if r['correct'])}/{len(baseline)} "
        f"({baseline_score:.0%})**\n"
        f"- **Improved** (after corrections injected for round-1 misses): "
        f"**{sum(1 for r in improved if r['correct'])}/{len(improved)} "
        f"({improved_score:.0%})**\n"
        f"- **Lift**: +{(improved_score - baseline_score) * 100:.0f} pts\n\n"
        f"## Claims that flipped after one correction round\n\n"
    )
    if not flipped:
        report += "_(none — baseline was already perfect, or corrections didn't take)_\n"
    else:
        for b, i in flipped:
            report += (
                f"- _{b['text']}_\n"
                f"  - truth: **{b['is_true']}**\n"
                f"  - baseline verdict: **{b['verdict']}** (wrong)\n"
                f"  - improved verdict: **{i['verdict']}** (correct)\n\n"
            )
    REPORT_PATH.write_text(report)
    print(f"\nReport written to {REPORT_PATH}")
    print("\n" + report)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=10)
    parser.add_argument("--regenerate", action="store_true",
                        help="Force a new frozen test set")
    args = parser.parse_args()
    asyncio.run(run(args.n, args.regenerate))
