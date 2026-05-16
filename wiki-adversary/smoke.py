"""Minimal smoke test: ingest one fact, recall it back."""

import asyncio

from dotenv import load_dotenv

import cognee


async def main():
    print("Pruning state...")
    await cognee.prune.prune_data()
    await cognee.prune.prune_system(metadata=True)

    print("Remembering 1 fact...")
    await cognee.remember(
        "Paris is the capital of France. The Eiffel Tower stands 330 meters tall.",
        dataset_name="smoke",
    )

    print("Recalling...")
    results = await cognee.recall(
        "How tall is the Eiffel Tower?",
        datasets=["smoke"],
    )
    for r in results:
        print(" ->", r)


if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
