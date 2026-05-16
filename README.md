# Wiki Adversary

> An LLM wiki that hardens by being **lied to**.

Built in 3 hours at the [Cognee × Redis AI-Memory Hackathon](https://bit.ly/cognee-sf-may-2026) — San Francisco, May 16, 2026.

> *"Instead of just retrieving from raw documents at query time, the LLM incrementally builds and maintains a persistent wiki."* — Andrej Karpathy

Most agents improve when a human tells them the truth. **Wiki Adversary improves when an attacker tries to fool it.** Each surviving lie patches the wiki and reinforces the graph. No labels. No reward model. Just survival.

---

## The idea

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   1. The wiki is seeded with subtly WRONG facts.         │
│                                                          │
│   2. An Attacker reads the canonical TRUTH and emits     │
│      claims back to the system — some true, some false.  │
│                                                          │
│   3. A Defender consults the (corrupted) wiki and        │
│      judges TRUE/FALSE. It is wrong sometimes.           │
│                                                          │
│   4. An independent Oracle re-reads the canonical TRUTH  │
│      for each claim and returns the real ground truth —  │
│      it never sees the wiki. This is the only signal we  │
│      trust when deciding whether to patch the wiki.      │
│                                                          │
│   5. If the Defender disagrees with the Oracle, an       │
│      authoritative "Correction:" is injected into the    │
│      graph via cognee.remember(...).                     │
│                                                          │
│   6. Next round, the wiki recall surfaces the patch      │
│      first. Score climbs. The wiki has self-healed.      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Three agents, separation of concerns

| Agent | Reads | Outputs | Role |
|---|---|---|---|
| **Attacker** | canonical truth source | mixed true/false claims | adversary (may hallucinate) |
| **Defender** | the wiki (cognee graph) | TRUE/FALSE verdict | system under test |
| **Oracle** | canonical truth source | TRUE/FALSE ground truth | independent ground-truth authority |

Decisions to inject a correction compare the Defender against the **Oracle**, not against the Attacker. If the Attacker's own labelling is wrong, the Oracle overrides it and the wiki stays clean.

## What's in this repo

```
BrainBase/
├── brief/                 Hackathon brief, partner docs, submission template
└── wiki-adversary/        The project
    ├── wiki_adversary/    Python — Attacker, Defender, Cognee + Redis glue
    ├── my_skills/         Cognee skill definitions (Markdown)
    ├── data/              Source documents (canonical truth + corrupted seed)
    ├── ui/                Next.js 16 dashboard (App Router, shadcn, MagicUI)
    ├── main.py            Bounded run for the SUBMISSION evidence
    └── live_demo.py       Long-running loop that feeds the live UI
```

## How the three layers fit together

```
┌──────────────────────┐    rounds every ~10s
│  Python loop         │ ────────────────────┐
│  (live_demo.py)      │                     │
│                      │                     ▼
│  - generates claims  │            ┌──────────────────┐
│  - judges via cognee │            │      Redis       │
│  - injects fixes     │ ────────▶ │                  │
└──────────────────────┘            │  state           │
                                    │  round:current   │
                                    │  vulnerabilities │
                                    │  wiki:contents   │
                                    │  events:log      │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │  Next.js route   │
                                    │  /api/state      │
                                    │  (ioredis)       │
                                    └────────┬─────────┘
                                             │ JSON, polled every 1s
                                             ▼
                                    ┌──────────────────┐
                                    │      Browser     │
                                    │  localhost:3000  │
                                    └──────────────────┘
```

## Where Redis earns its keep (beyond cache)

- **`round:current`** — JSON snapshot of the round in progress, updated incrementally so the UI animates each verdict as it lands.
- **`vulnerabilities`** ZSET — every claim that fooled the Defender, ranked by severity (`1.0` for false-positive, `0.6` for false-negative).
- **`wiki:contents`** list — the live wiki snapshot. Originals at the bottom, corrections at the top.
- **`events:log`** list — typed pipeline events the UI streams into a terminal-style log card.
- **Session memory** — cognee uses Redis for the per-conversation scratchpad (`remember(..., session_id=…)`).

## Run it

### Prereqs

- Python 3.10–3.14 · Node 22 · pnpm 11 · Redis (brew or Docker)
- An OpenAI API key (`LLM_API_KEY` in `wiki-adversary/.env`)

### Backend

```bash
cd wiki-adversary
uv venv && source .venv/bin/activate
uv pip install -e .
brew services start redis        # or: docker run -p 6379:6379 redis
python -m wiki_adversary.live_demo
```

### Frontend

```bash
cd wiki-adversary/ui
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The nav grows a green pulsing **● Live** badge when the loop is reachable.

## Stack

| Layer | Choice |
|---|---|
| Memory engine | [Cognee](https://docs.cognee.ai) 1.1 |
| Real-time / state | [Redis](https://redis.io) 8 |
| LLM | OpenAI `gpt-5.4-nano` (Attacker, Defender, Oracle all on the same model) |
| Backend | Python 3.12, `asyncio`, `openai`, `redis-py` |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind v4 |
| UI primitives | [shadcn/ui](https://ui.shadcn.com) (base-nova), [MagicUI](https://magicui.design) (Aurora, AnimatedList, NumberTicker, BorderBeam) |

## Live UI at a glance

- **Hero** — pitch in one sentence.
- **How it works** — three numbered cards.
- **Live demo** — Attacker + Defender + Score + Top vulnerabilities (Redis ZSET) updated in real time.
- **Wiki contents** — the actual current state of the graph, corrections pinned at top, corrupted seeds dimmed at bottom.
- **Pipeline log** — every backend action streamed into a terminal-style feed (timestamp · kind · message).

## Acknowledgements

- **Cognee** for organizing the hackathon and the memory engine itself.
- **Redis** for the technology partner sponsorship and the prize.
- **Pebblebed** for hosting.
- **Karpathy** for the [LLM wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) that inspired the event.

Made by [@benjaminmerchin](https://github.com/benjaminmerchin) with [Claude Code](https://claude.com/claude-code).
