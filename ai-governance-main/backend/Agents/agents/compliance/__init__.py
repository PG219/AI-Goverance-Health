"""
Compliance sub-agents package.

Each module in this package independently calculates a score, generates
recommendations, and produces detailed analysis for ONE regulatory
framework. The orchestrator (governance_agent_v1.py) calls each agent's
`run(...)` function and merges the results — it no longer contains any
framework-specific scoring logic itself.
"""

from . import eu_ai_act_agent
from . import nist_agent
from . import iso_agent

# Ordered list of (framework_key, agent_module) used by the orchestrator
# to loop over all sub-agents generically.
FRAMEWORK_AGENTS = [
    ("EU", eu_ai_act_agent),
    ("NIST", nist_agent),
    ("ISO", iso_agent),
]

__all__ = ["eu_ai_act_agent", "nist_agent", "iso_agent", "FRAMEWORK_AGENTS"]