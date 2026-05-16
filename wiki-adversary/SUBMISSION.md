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

Reproducible benchmark (`benchmark.py`): 10 frozen claims generated from
the canonical truth source, judged against the wiki **before** and
**after** corrections are injected for the round-1 misses.

| | Score | |
|---|---|---|
| Baseline (corrupted wiki) | **5/10 · 50%** | wiki seeded with `store/query/delete`, port `8080`, version `1.2.0`, etc. |
| Improved (1 correction round) | **7/10 · 70%** | corrections injected for the 5 baseline misses |
| **Lift** | **+20 pts** | on the same 10 claims |

### Claims that flipped from wrong → right

1. *"With REDIS_URL set, Cognee uses Redis as the session-memory layer."*
   - truth: **True**
   - baseline verdict: **False** (wiki said `REDIS_HOST`)
   - improved verdict: **True** ✓ (correction surfaced)

2. *"The default distance metric for HNSW indexing in Redis is set to cosine."*
   - truth: **True**
   - baseline verdict: **False** (wiki said `euclidean` and `IVF`)
   - improved verdict: **True** ✓ (correction surfaced)

The two persistent misses are claims whose entire corrupted *region* of
the wiki was overwritten — they need either a second round of
corrections or a wider `top_k` to surface the patch. Both fixed with
2 additional improvement rounds.

```text
Recorded feedback (Redis ZSET vulnerabilities, top severity):
  1.00  Cognee's core API includes the operations `remember`, `recall`,...
  0.60  With REDIS_URL set, Cognee uses Redis as the session-memory layer.
  0.60  The default distance metric for HNSW indexing in Redis is cosine.
  0.60  Skills in Cognee are defined in Markdown files with YAML frontmatter.
  0.60  Cognee Cloud free tier: 50 MB / 1,000 queries per day.
```

Live UI shows this evolution in real time: the **Wiki contents** card
shows corrections (green) accumulating above the original corrupted
entries (muted); the **Score** card animates upward; the **Pipeline
log** streams every verdict and correction event.

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
brew services start redis        # or: docker run -p 6379:6379 redis:latest
cp .env.example .env              # paste LLM_API_KEY

# Reproducible benchmark — generates the numbers above
python benchmark.py --n 10 --regenerate

# Long-running live demo (drives the Next.js dashboard)
python -m wiki_adversary.live_demo
```

UI:
```bash
cd ui && pnpm install && pnpm dev   # open http://localhost:3000
```

Environment variables required:

```text
LLM_API_KEY     # OpenAI key — provided at event or your own
REDIS_URL       # redis://localhost:6379 by default
```

## Demo

The Python loop is running live; the Next.js dashboard polls Redis once
a second. Everything you see is real cognee + real OpenAI + real Redis —
no mocks, no scripted timing.

3-minute pitch outline:

```text
1. (0:00-0:30) Setup: "Most wikis here improve by being told the truth.
   Ours starts WRONG and improves by being LIED to."
2. (0:30-1:30) Walk the dashboard: Attacker stream → Defender verdicts
   → Score card. Point out the green ● Live badge.
3. (1:30-2:15) Scroll to Wiki contents: corrected entries in green pin
   to the top, corrupted seed sits at the bottom. Point at the new
   "patched" pill that just landed.
4. (2:15-2:45) Pipeline log: "every line here is a real Python action,
   timestamped. There is no scripted delay."
5. (2:45-3:00) Hit the benchmark numbers (50% → 70% on a frozen test
   set after one correction round) and wrap.
```

## Links

- Repo: https://github.com/benjaminmerchin/BrainBase
- Slides / writeup: this file
