# Benchmark — Wiki Adversary self-improvement

- **Frozen test set**: 10 claims generated from the truth source.
- **Baseline** (wiki seeded with errors): **5/10 (50%)**
- **Improved** (after corrections injected for round-1 misses): **7/10 (70%)**
- **Lift**: +20 pts

## Claims that flipped after one correction round

- _With REDIS_URL set, Cognee uses Redis as the session-memory layer._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

- _The default distance metric for HNSW indexing in Redis is set to cosine._
  - truth: **True**
  - baseline verdict: **False** (wrong)
  - improved verdict: **True** (correct)

