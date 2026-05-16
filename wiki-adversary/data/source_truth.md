# Cognee — technical reference (CANONICAL TRUTH)

# This file is the ground truth the Attacker reads. The wiki is seeded with
# sample_source.md, which contains the same topic but with subtle errors —
# wrong numbers, swapped identifiers, off-by-one versions. The Attacker
# generates claims from THIS file; the Defender consults the wiki; misses
# happen because the wiki is wrong; corrections are injected and the wiki
# converges to truth.

## Core API

Cognee exposes four operations: `remember`, `recall`, `forget`, and
`improve`. Calling `remember(text, session_id="…")` routes the content to
fast session memory. Calling `remember(text)` without a session_id writes
directly into the permanent knowledge graph. `recall(query_text)` returns
up to `top_k=10` results by default. The cognee Python package version is
1.1.0 (released April 2026).

## Skills

Skills are Markdown (.md) files with YAML frontmatter declaring a
`description` and `allowed-tools`. They are ingested with
`cognee.remember(path, content_type="skills")`. At query time they are
selected by name via the `skills=[…]` parameter of `cognee.search`. After
each run, a `SkillRunEntry` records a `success_score` between 0.0 and 1.0.
When the score falls below `score_threshold=0.5` (default), cognee
generates a `SkillImprovementProposal`. The proposal is applied only when
the caller explicitly invokes `improve_skill(name, apply=True)`.

## Redis integration

With `REDIS_URL` set, cognee uses Redis as the session-memory layer:
`remember(…, session_id="x")` writes there first and syncs to the graph
in the background. With `vector_db_provider="redis"`, cognee additionally
uses Redis as the vector store. The Cognee × Redis adapter ships in the
`cognee-community` repo and supports HNSW indexing with a `dims=1536`,
`distance_metric="cosine"` default schema.

## CLI and UI

The CLI is `cognee-cli` and supports `remember`, `recall`, and `forget`.
Running `cognee-cli -ui` serves a local web UI at http://localhost:3000.
The Python package is installed with `uv pip install "cognee[redis]"`.
Cognee supports Python 3.10 through 3.14.

## Cloud

Cognee Cloud is reached with `await cognee.serve(url="…", api_key="ck_…")`.
The free tier allows up to 50 MB of stored memory and 1,000 queries per
day. Paid plans start at $19/month for 1 GB / 100k queries.
