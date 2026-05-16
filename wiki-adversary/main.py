"""CLI entry — run N adversarial rounds against a source document.

Usage:
    python main.py --source data/sample_source.md --rounds 2 --attacks-per-round 5
"""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from dotenv import load_dotenv

from wiki_adversary.loop import (
    ingest_source,
    lint_round,
    reset_world,
    run_round,
)


def _print_round(idx: int, score: float, results) -> None:
    correct = sum(1 for r in results if r.correct)
    print(f"\n=== Round {idx} === score: {correct}/{len(results)} ({score:.0%})")
    for r in results:
        mark = "✔" if r.correct else "✘"
        print(f"  {mark} [{r.error_type:>16}] truth={r.ground_truth!s:5} verdict={r.verdict!s:5}  {r.claim_text}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to source doc")
    parser.add_argument("--rounds", type=int, default=2)
    parser.add_argument("--attacks-per-round", type=int, default=5)
    parser.add_argument("--no-reset", action="store_true", help="Keep prior state")
    args = parser.parse_args()

    load_dotenv()

    if not Path(args.source).exists():
        raise SystemExit(f"Source not found: {args.source}")

    if not args.no_reset:
        print("Resetting Cognee + Redis state...")
        await reset_world()

    print(f"Ingesting {args.source}...")
    source_text, user, dataset = await ingest_source(args.source)

    scores: list[float] = []
    for i in range(1, args.rounds + 1):
        score, results = await run_round(
            source_text=source_text,
            user=user,
            dataset=dataset,
            round_idx=i,
            attacks_per_round=args.attacks_per_round,
        )
        _print_round(i, score, results)
        scores.append(score)

    top = await lint_round(top_n=5)
    print("\n=== Top vulnerabilities (Redis ZSET) ===")
    for text, sev in top:
        print(f"  {sev:.2f}  {text}")

    print("\n=== Self-improvement curve ===")
    for i, s in enumerate(scores, 1):
        bar = "#" * int(s * 20)
        print(f"  R{i}: [{bar:<20}] {s:.0%}")


if __name__ == "__main__":
    asyncio.run(main())
