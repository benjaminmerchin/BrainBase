// Mock data for the demo. Swap with a Redis read once the backend is wired.

export type Claim = {
  id: string;
  text: string;
  truth: boolean;
  verdict: boolean | null;
};

export type Vulnerability = {
  claim: string;
  severity: number;
};

export type Round = {
  index: number;
  scorePct: number;
  claims: Claim[];
};

export const ROUND_1: Round = {
  index: 1,
  scorePct: 40,
  claims: [
    {
      id: "1-a",
      text: "Cognee exposes four core operations: remember, recall, forget, improve.",
      truth: true,
      verdict: true,
    },
    {
      id: "1-b",
      text: "Calling remember without a session_id routes content to fast session memory.",
      truth: false,
      verdict: true,
    },
    {
      id: "1-c",
      text: "Skills in Cognee are YAML files with embedded Python.",
      truth: false,
      verdict: false,
    },
    {
      id: "1-d",
      text: "Cognee can use Redis as both session-memory layer and vector store.",
      truth: true,
      verdict: true,
    },
    {
      id: "1-e",
      text: "The cognee CLI exposes a local UI at http://localhost:8080.",
      truth: false,
      verdict: true,
    },
  ],
};

export const ROUND_2: Round = {
  index: 2,
  scorePct: 90,
  claims: [
    {
      id: "2-a",
      text: "A SkillRunEntry triggers a proposal only when success_score < score_threshold.",
      truth: true,
      verdict: true,
    },
    {
      id: "2-b",
      text: "improve_skill applies a proposal whenever apply=False is passed.",
      truth: false,
      verdict: false,
    },
    {
      id: "2-c",
      text: "Cognee is installed via `uv pip install cognee[redis]`.",
      truth: true,
      verdict: true,
    },
    {
      id: "2-d",
      text: "Skills are matched at query time by their YAML description field.",
      truth: false,
      verdict: true,
    },
    {
      id: "2-e",
      text: "Cognee runs sub-millisecond similarity search with Redis as backend.",
      truth: true,
      verdict: true,
    },
  ],
};

export const VULNERABILITIES: Vulnerability[] = [
  {
    claim:
      "Calling remember without a session_id routes to fast session memory.",
    severity: 1.0,
  },
  {
    claim: "The cognee CLI exposes a local UI at http://localhost:8080.",
    severity: 1.0,
  },
  {
    claim: "Skills are matched at query time by their YAML description field.",
    severity: 1.0,
  },
];

export const SKILL_DIFF = {
  before: `---
description: Decide whether a claim is supported by the wiki.
allowed-tools: memory_search
---

# Instructions

You are a Defender. A claim is presented. Decide TRUE or FALSE based on
what the wiki holds. If the wiki does not support the claim, return FALSE.

Output strict JSON: \`{"verdict": "true"|"false", "rationale": "..."}\`.`,
  after: `---
description: Decide whether a claim is supported by the wiki.
allowed-tools: memory_search
---

# Instructions

You are a Defender. A claim is presented. Decide TRUE or FALSE based on
what the wiki holds. If the wiki does not support the claim, return FALSE.

CRITICAL: Distrust claims that paraphrase the source with substituted
identifiers (URLs, ports, field names, library names). Verify entity-level
facts against at least two graph edges before asserting TRUE.

Output strict JSON: \`{"verdict": "true"|"false", "rationale": "..."}\`.`,
};
