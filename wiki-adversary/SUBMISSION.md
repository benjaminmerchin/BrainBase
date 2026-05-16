# Team Submission — Wiki Adversary

## Team

- Team name: TBD
- Participants: Benjamin Merchin
- Wiki / project name: Wiki Adversary

## Wiki Overview

An LLM wiki that **hardens by being attacked.** A Defender agent answers
true/false claims against a Cognee knowledge graph. An Attacker agent
generates plausible-but-false claims from the same source. Each missed
claim becomes a graph reinforcement plus a `SkillRunEntry` that rewrites
the Defender's skill. The wiki is *not* improved by users telling it
the answer — it is improved by surviving attempts to fool it.

- Domain or data sources: any factual source (Wikipedia article, doc page, internal spec)
- Primary use case: hardening a fact-grounded agent against plausible-sounding falsehoods
- What makes it stand out: adversarial co-evolution as the *only* improvement signal — no human labels, no thumbs-up/down, no oracle. Just survival against an attacker that also reads the source.

## The Three Operations

### Ingest

- What goes in: a source document (Markdown / URL) treated as ground truth
- How it is captured: `cognee.remember(path, dataset_name="wiki-adversary", content_type="documents")`
- Code entry point: `wiki_adversary/loop.py::ingest_source`

### Query + Self-improve

- How users query the wiki: programmatic — Defender calls `cognee.search(..., query_type=SearchType.AGENTIC_COMPLETION, skills=["defender"], session_id=round_id)`
- Where feedback comes from: the Attacker (not a human). Ground truth = whether the claim is actually supported by the source (Attacker knows because Attacker wrote both true and false claims from the same source).
- How feedback updates the wiki:
  - Miss → `SkillRunEntry(success_score=0.0, feedback=-1.0)` with `skill_improvement={apply: False, score_threshold: 0.9}`
  - Proposal extracted from `proposal_result.items`, then `improve_skill(apply=True)` rewrites `my_skills/defender/SKILL.md`
- Code entry point: `wiki_adversary/loop.py::run_round`

### Lint

- What "linting" means here: post-round scan that (1) finds graph nodes contradicted by accepted claims, (2) reinforces nodes whose verdicts the Defender got right under attack, (3) prunes nodes never used in a winning answer.
- How it runs: on-demand after each round, driven by the Redis `vulnerabilities` sorted set (`ZREVRANGE` top-N) so we lint where it matters most.
- Code entry point: `wiki_adversary/loop.py::lint_round`

## Self-Improvement Evidence

> Filled in after Round 1 vs Round N runs.

### Baseline Run

- Query / task: 10 claims (5 true, 5 false) about [source TBD]
- Result: TBD
- Score (correct verdicts / 10): TBD
- Recorded feedback:

```text
error_type:       false-positive | false-negative
error_message:    "Defender accepted: '<false claim>' citing <wrong graph node>"
feedback:         -1.0
success_score:    0.0
```

### Improved Run (round N)

- Query / task: 10 *new* claims on the same source (different falsehoods)
- Result: TBD
- Score: TBD
- What changed in the wiki between runs:

```text
Before:
  defender/SKILL.md — "Answer true/false based on the wiki."

After:
  defender/SKILL.md — adds: "Distrust claims that paraphrase the source
  with substituted proper nouns or flipped numerical relationships;
  cross-check entity-level facts against multiple graph edges before
  asserting true."
```

## Architecture

```
            [ source document ]
                    |
                    v
        cognee.remember(content_type="documents")
                    |
                    v
            [ Cognee knowledge graph ]

       ┌──────────────────────────────────┐
       │ Attacker (LLM, reads source)     │
       │  emits: {text, is_true} claims   │
       └──────────────┬───────────────────┘
                      | XADD attacks:pending
                      v
              [ Redis Stream ]
                      |
                      | XREAD
                      v
       ┌──────────────────────────────────┐
       │ Defender (cognee skill, session) │
       │  verdict ← graph + skill         │
       └──────────────┬───────────────────┘
                      |
        ┌─────────────┴──────────────┐
        | correct                    | wrong
        v                            v
   reinforce graph node       ZADD vulnerabilities
                              SkillRunEntry(score=0)
                              improve_skill(apply=True)
                                       |
                                       v
                              [ updated SKILL.md ]
                                       |
                                       v
                              next round
```

### Redis-as-session-memory

- What the agent writes into Redis (via Cognee's session_memory):
  the current round's running context — recent claims and verdicts,
  intermediate evidence excerpts pulled from the graph.
- How and when content is distilled into the graph: at end of round,
  reinforcement signals (which graph nodes were cited in *correct*
  verdicts) are written via plain `cognee.remember(...)` without a
  `session_id` → promoted to the durable graph.
- What stays in Redis vs. promoted: ephemeral reasoning traces stay in
  Redis (per-round). Verdict signals and skill rewrites are promoted.
- How distillation quality improved between baseline and improved run:
  TBD — measured by Defender score on held-out claims.

## Agents / Skills

```text
Skill path(s):    my_skills/defender/SKILL.md
                  my_skills/attacker/SKILL.md
Roles:
  - Ingestor:     wiki_adversary/loop.py::ingest_source
  - Querier:      wiki_adversary/defender.py
  - Linter:       wiki_adversary/loop.py::lint_round
  - Critic:       wiki_adversary/attacker.py + wiki_adversary/judge.py
```

## Reproduction

```bash
uv venv && source .venv/bin/activate
uv pip install -e .
docker run -d -p 6379:6379 redis:latest
cp .env.example .env  # paste LLM_API_KEY
python main.py --source data/sample_source.md --rounds 3 --attacks-per-round 10
```

Environment variables required:

```text
LLM_API_KEY     # provided at event
REDIS_URL       # redis://localhost:6379 by default
```

## Demo

- Live demo: 3-minute pitch outline:

```text
1. (0:00-0:30) Idea: "Most wikis here improve by being told the truth.
   Ours improves by being lied to."
2. (0:30-1:15) Round 1 live: ingest [source], 5 attacks, 2/5 fooled.
3. (1:15-2:00) Show: skill diff (markdown before/after), top
   vulnerability in Redis ZSET.
4. (2:00-2:45) Round 2: 5 NEW attacks. Score jumps from 60% → 90%.
5. (2:45-3:00) "Adversarial self-hardening. No human in the loop."
```

## Links

- Repo: https://github.com/benjaminmerchin/BrainBase
- Slides / writeup: this file
