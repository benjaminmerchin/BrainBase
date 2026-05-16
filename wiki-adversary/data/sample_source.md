# Sample source — Cognee at a glance

Cognee is an open-source AI memory engine. It transforms unstructured
data — documents, chats, runs — into a persistent knowledge graph that
agents can query and refine over time.

Cognee exposes four core operations: `remember`, `recall`, `forget`, and
`improve`. Calling `remember` with a `session_id` routes the content to
fast session memory; calling `remember` without a `session_id` writes
directly into the permanent knowledge graph.

Cognee can use Redis as both its session-memory layer and its vector
store. With Redis as the vector backend, Cognee stores embeddings in
Redis and runs sub-millisecond similarity search at query time.

Skills in Cognee are Markdown files with YAML frontmatter that declare
the skill's `description` and `allowed-tools`. Skills are ingested with
`content_type="skills"` and selected at query time by name. After each
run, a `SkillRunEntry` records a `success_score`; when that score falls
below `score_threshold`, Cognee proposes a rewritten skill. The
proposal is applied only when the caller explicitly invokes
`improve_skill(..., apply=True)`.

The cognee Python package is installed with `uv pip install
"cognee[redis]"`. The CLI is `cognee-cli`, which supports `remember`,
`recall`, and `forget`, and exposes a local UI at
http://localhost:3000 via `cognee-cli -ui`.
