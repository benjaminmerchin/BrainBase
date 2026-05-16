# Wiki Adversary

An LLM wiki that **hardens by being attacked.**

A Defender agent answers questions from a Cognee knowledge graph.
An Attacker agent generates plausible-but-false claims about the same
source material. Each round, the Defender judges true/false. Misses
update the wiki and rewrite the Defender's skill. The wiki gets
provably more robust round over round.

Cognee × Redis Hackathon — 2026-05-16.

## How it maps to the brief

| Hackathon op | What we do |
|---|---|
| **Ingest** | `cognee.remember(source, content_type="documents")` builds the knowledge graph from a source doc. |
| **Query + Self-improve** | Defender uses an AGENTIC_COMPLETION skill; misses generate a `SkillRunEntry` with a low score → `improve_skill(apply=True)`. |
| **Lint** | Post-round pass over the graph, driven by the Redis `vulnerabilities` sorted set, dedupes/strengthens nodes that were exploited. |

## Why Redis (beyond cache)

- **Stream `attacks:pending`** — Attacker pushes claims, Defender consumes.
- **Sorted set `vulnerabilities`** — claims that fooled the Defender, scored by severity. Drives where Lint focuses.
- **Session memory** (Cognee-managed) — per-round context, isolated by `session_id`.
- **Semantic cache** — incoming attacks similar to ones already seen short-circuit to the cached verdict.

## Quickstart

```bash
# 1. Install
uv venv && source .venv/bin/activate
uv pip install -e .

# 2. Redis
docker run -d -p 6379:6379 redis:latest

# 3. Env
cp .env.example .env  # then paste LLM_API_KEY

# 4. Run one round
python main.py --source data/sample_source.md --rounds 2 --attacks-per-round 5
```

## Layout

```
wiki-adversary/
├── main.py                       # CLI entry
├── wiki_adversary/
│   ├── attacker.py               # generates claims (true + false)
│   ├── defender.py               # judges claims via cognee skill
│   ├── judge.py                  # scores defender vs ground truth
│   ├── redis_layer.py            # stream + sorted-set ops
│   └── loop.py                   # orchestrates one round
├── my_skills/
│   ├── defender/SKILL.md
│   └── attacker/SKILL.md
├── data/sample_source.md         # demo source
└── SUBMISSION.md                 # judge-facing writeup
```

See `SUBMISSION.md` for the full writeup template (filled in as we run).
