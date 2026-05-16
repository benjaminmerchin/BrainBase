# Wiki Adversary

An LLM wiki that **hardens by being attacked**, with an independent oracle keeping the system honest.

Cognee × Redis Hackathon — 2026-05-16.

## How it maps to the brief

| Hackathon op | What we do |
|---|---|
| **Ingest** | `cognee.remember(source)` builds the knowledge graph from the (deliberately-corrupted) seed source. |
| **Query + Self-improve** | Defender queries with `cognee.recall(query, query_type=CHUNKS)`. Misses (verdict ≠ Oracle truth) inject an authoritative `Correction:` entry via `cognee.remember(...)`. |
| **Lint** | Redis `vulnerabilities` ZSET surfaces the top-severity misses; the wiki snapshot in `wiki:contents` is shown to the UI with the corrupted seed dimmed and patches pinned at top. |

## Three-agent architecture

```
Attacker LLM            Defender LLM            Oracle LLM
    │                       │                       │
    ▼                       ▼                       ▼
reads canonical         reads the wiki         reads canonical
truth source            (cognee.recall)        truth source
emits 5 claims          → TRUE/FALSE verdict   → ground truth
    │                       │                       │
    └───────────────────────┴───────────────────────┘
                            ▼
              compare verdict against ORACLE
              ┌─────┴──────┐
              ▼            ▼
          correct       miss
                          │
                          ▼
              cognee.remember("Correction: …")
              redis ZADD vulnerabilities
              redis LPUSH wiki:contents
```

The Oracle never sees the wiki. The Attacker is now just a question
generator; if it labels its own claim wrong, the Oracle overrides it
and we log an `oracle_override` event.

## Why Redis (beyond cache)

| Key | Type | What it carries |
|---|---|---|
| `round:current` | string (JSON) | incremental snapshot of the round in progress — UI animates verdicts as they land |
| `state` | hash | round index, score %, status, timestamps |
| `vulnerabilities` | ZSET | every claim that fooled the Defender, severity-ranked |
| `wiki:contents` | list | live snapshot of the graph entries (LPUSH for corrections) |
| `events:log` | list | typed pipeline log streamed into a terminal-style UI card |
| `graph:html` | string | latest D3 force-directed visualization, served to the UI iframe |
| session memory | (cognee-managed) | per-round scratchpad via `remember(..., session_id=…)` |

## Quickstart

```bash
# 1. Install
uv venv && source .venv/bin/activate
uv pip install -e .

# 2. Redis (local)
brew services start redis        # or: docker run -p 6379:6379 redis:latest

# 3. Env
cp .env.example .env             # paste LLM_API_KEY (and optionally LLM_MODEL)

# 4. Reproducible before/after benchmark — generates the SUBMISSION numbers
python benchmark.py --n 10 --regenerate

# 5. Long-running live demo (feeds the Next.js dashboard)
python -m wiki_adversary.live_demo
```

UI:

```bash
cd ui && pnpm install && pnpm dev   # http://localhost:3000
```

## Layout

```
wiki-adversary/
├── benchmark.py                       reproducible before/after run
├── bench_results.md                   numbers consumed by SUBMISSION.md
├── data/
│   ├── source_truth.md                Attacker + Oracle's canonical truth
│   └── sample_source.md               wiki seed (subtly wrong on purpose)
├── wiki_adversary/
│   ├── live_demo.py                   the long-running loop (Attacker / Defender / Oracle)
│   ├── graph_snapshot.py              renders cognee viz with our domain schema
│   ├── redis_state.py                 every write the UI consumes
│   └── __init__.py
├── ui/                                Next.js 16 dashboard
└── SUBMISSION.md                      judge-facing writeup, real numbers
```

See `SUBMISSION.md` for the filled-in submission template with the
benchmark numbers and the demo pitch.
