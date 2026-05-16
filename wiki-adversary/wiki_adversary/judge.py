"""Judge — compares Defender verdict to ground truth and produces a score.

Severity scoring (used to rank Redis vulnerabilities):
- false-positive (accepted a lie):  1.0  (most dangerous)
- false-negative (rejected a truth): 0.6
- correct: 0.0 (not recorded)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class JudgeResult:
    claim_text: str
    ground_truth: bool
    verdict: bool
    correct: bool
    severity: float
    error_type: str  # "ok" | "false-positive" | "false-negative"


def score_one(claim: dict, verdict: bool) -> JudgeResult:
    truth = bool(claim["is_true"])
    correct = verdict == truth
    if correct:
        return JudgeResult(claim["text"], truth, verdict, True, 0.0, "ok")
    if verdict is True and truth is False:
        return JudgeResult(claim["text"], truth, verdict, False, 1.0, "false-positive")
    return JudgeResult(claim["text"], truth, verdict, False, 0.6, "false-negative")


def round_score(results: list[JudgeResult]) -> float:
    if not results:
        return 0.0
    return sum(1 for r in results if r.correct) / len(results)
