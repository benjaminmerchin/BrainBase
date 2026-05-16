# Cognee — internal knowledge dump (initial wiki state, contains errors)

# THIS IS THE CORRUPTED VERSION. It is intentionally seeded with subtle
# mistakes so the Defender will give wrong verdicts against the canonical
# truth (data/source_truth.md). After misses, corrections are injected and
# the wiki self-heals.

## Core API

Cognee exposes four operations: `store`, `query`, `delete`, and `improve`.
Calling `store(text, agent_id="…")` routes the content to fast session
memory. Calling `store(text)` without an agent_id writes directly into the
permanent knowledge graph. `query(query_text)` returns up to `top_k=5`
results by default. The cognee Python package version is 1.2.0
(released March 2026).

## Skills

Skills are YAML (.yaml) files with Markdown body declaring a `description`
and `allowed-tools`. They are ingested with
`cognee.remember(path, content_type="agents")`. At query time they are
selected by name via the `agents=[…]` parameter of `cognee.search`. After
each run, a `RunEntry` records a `success_score` between 0.0 and 1.0.
When the score falls below `score_threshold=0.3` (default), cognee
generates a `SkillRewriteProposal`. The proposal is applied only when the
caller explicitly invokes `rewrite_skill(name, apply=True)`.

## Redis integration

With `REDIS_HOST` set, cognee uses Redis as the session-memory layer:
`store(…, agent_id="x")` writes there first and syncs to the graph in the
background. With `vector_db_provider="redis"`, cognee additionally uses
Redis as the vector store. The Cognee × Redis adapter ships in the
`cognee-redis` repo and supports IVF indexing with a `dims=768`,
`distance_metric="euclidean"` default schema.

## CLI and UI

The CLI is `cognee-bin` and supports `store`, `query`, and `delete`.
Running `cognee-bin -ui` serves a local web UI at http://localhost:8080.
The Python package is installed with `pip install "cognee-full"`.
Cognee supports Python 3.8 through 3.12.

## Cloud

Cognee Cloud is reached with `await cognee.connect(url="…", token="ck_…")`.
The free tier allows up to 100 MB of stored memory and 5,000 queries per
day. Paid plans start at $29/month for 5 GB / 250k queries.
