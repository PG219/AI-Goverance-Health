"""
EU AI Act Compliance Sub-Agent
-------------------------------
Computes the EU AI Act framework score, recommendations, and detailed
analysis from already-scored questions (per_question_scores) and the
control matrix. This module owns ONLY EU-specific scoring logic.
"""

from __future__ import annotations
from typing import Dict, List, Any

FRAMEWORK = "EU"


def calculate_score(
    questions: List[Dict[str, Any]],
    controls: Dict[str, Any],
    per_question_scores: Dict[str, int],
) -> float:
    """Calculate the EU AI Act maturity score (0-100) from question and
    control evidence weighted specifically for the EU framework."""
    total = 0.0
    max_total = 0.0

    for q in questions:
        qid = q["id"]
        maturity = per_question_scores.get(qid, 0) / 4.0
        w = q["weights"].get(FRAMEWORK, 0.0)
        total += maturity * w
        max_total += 1.0 * w

    for key, ctl in controls.items():
        if bool(ctl.get("evidence")):
            w = float(ctl.get("weights", {}).get(FRAMEWORK, 0.0))
            total += 0.2 * w
            max_total += 0.2 * w

    return (100.0 * (total / max_total)) if max_total > 0 else 0.0


def recommend_next_steps(score: float, controls: Dict[str, Any]) -> List[str]:
    """Generate EU AI Act specific recommendations."""
    recs: List[str] = []

    if score < 70:
        recs.append(
            "Focus on EU AI Act compliance: establish risk classification "
            "and enhance technical documentation."
        )

    for key, ctl in controls.items():
        weights = ctl.get("weights", {})
        if weights.get(FRAMEWORK, 0) > 0.5 and not bool(ctl.get("evidence")):
            recs.append(f"Implement missing control: {ctl['desc']}")

    return recs[:8]


def generate_detailed_analysis(
    questions: List[Dict[str, Any]],
    per_question_scores: Dict[str, int],
    controls: Dict[str, Any],
) -> Dict[str, List[str]]:
    """Generate EU AI Act specific contributing/missing analysis."""
    analysis: Dict[str, List[str]] = {"contributing": [], "missing": []}

    for qid, score in per_question_scores.items():
        q_info = next((q for q in questions if q["id"] == qid), None)
        if q_info and q_info["weights"].get(FRAMEWORK, 0) > 0.5:
            if score >= 2:
                analysis["contributing"].append(
                    f"Addressed: '{q_info['text']}' (Maturity: {score}/4)"
                )
            else:
                analysis["missing"].append(
                    f"Gap: '{q_info['text']}' (Maturity: {score}/4)"
                )

    for key, ctl in controls.items():
        if ctl.get("weights", {}).get(FRAMEWORK, 0) > 0.5:
            if ctl.get("evidence"):
                analysis["contributing"].append(f"Implemented: '{ctl['desc']}'")
            else:
                analysis["missing"].append(f"Missing Control: '{ctl['desc']}'")

    analysis["contributing"] = sorted(set(analysis["contributing"]))
    analysis["missing"] = sorted(set(analysis["missing"]))
    return analysis


def run(
    questions: List[Dict[str, Any]],
    controls: Dict[str, Any],
    per_question_scores: Dict[str, int],
) -> Dict[str, Any]:
    """Entry point used by the orchestrator. Returns this framework's full
    self-contained result: score, recommendations, and analysis."""
    score = calculate_score(questions, controls, per_question_scores)
    return {
        "framework": FRAMEWORK,
        "score": score,
        "recommendations": recommend_next_steps(score, controls),
        "detailed_analysis": generate_detailed_analysis(
            questions, per_question_scores, controls
        ),
    }
