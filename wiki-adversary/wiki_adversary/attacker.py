"""Attacker — generates a mix of true and false claims from the source.

The Attacker has *full* access to the source (it has to know ground truth to
construct plausible falsehoods). The Defender does NOT — Defender only sees
the Cognee graph, which may have lost or restructured detail during cognify.
That asymmetry is what makes the game non-trivial.
"""

from __future__ import annotations

import json
import os

from openai import AsyncOpenAI

ATTACKER_PROMPT = """You are an adversarial fact-checker. You will be given a SOURCE document.
Generate exactly {n} short claims about the source. Half must be TRUE (faithfully
restated from the source), half must be FALSE in a way that is plausible: subtle
substitutions of names/numbers, swapped relationships, near-paraphrases that flip
meaning. Avoid claims unrelated to the source.

Return strict JSON: {{"claims": [{{"text": "...", "is_true": true|false}}, ...]}}.

SOURCE:
---
{source}
---
"""


async def generate_attacks(source: str, n: int = 10) -> list[dict]:
    client = AsyncOpenAI(api_key=os.environ["LLM_API_KEY"])
    resp = await client.chat.completions.create(
        model=os.environ.get("LLM_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You output JSON only."},
            {"role": "user", "content": ATTACKER_PROMPT.format(source=source, n=n)},
        ],
    )
    data = json.loads(resp.choices[0].message.content)
    return data["claims"]
