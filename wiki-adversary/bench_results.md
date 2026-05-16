# Benchmark — Wiki Adversary self-improvement

- **Frozen test set**: 10 claims generated from the truth source.
- **Baseline** (wiki seeded with errors): **3/10 (30%)**
- **Improved** (after corrections injected for round-1 misses): **9/10 (90%)**
- **Lift**: +60 pts

## Claims that flipped after one correction round

- _Cognee exposes four operations: remember, recall, forget, and improve._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _Calling remember(text) without a session_id writes directly into the permanent knowledge graph._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _The cognee Python package version is 1.1.0, released in April 2026._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _Skills are Markdown (.md) files with YAML frontmatter that declares description and allowed-tools._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _When improve_skill is called with apply=True, the SkillImprovementProposal can be applied._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _With vector_db_provider="redis", Cognee uses Redis as the vector store with default dims=1536 and distance_metric="cosine"._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _Cognee Cloud is served via await cognee.serve(url="…", api_key="ck_…") and the free tier includes up to 50 MB of stored memory._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

