"""Typed state schema for Phase 6 Matcher LangGraph.

Ground truth JD-to-project matching state.
Follows the exact specification in AGENTS.md.
"""
from typing import TypedDict, Optional, List, Dict, Any, Union


class MatcherState(TypedDict):
    """State schema for the Matcher LangGraph pipeline.

    Flows through:
    START → load_job → load_portfolio → prefilter_projects → match_with_llm → validate_result
                                                                                  │
                                                        ┌─────────────────────────┼──────────────────┐
                                                     pass                    fail, retry<3        fail, retry≥3
                                                        │                         │                    │
                                                  save_result → END        match_with_llm         needs_review → END
                                                                            (loop back)
    """

    posting_id: Union[str, int]
    job_data: Optional[Dict[str, Any]]
    portfolio: Optional[List[Dict[str, Any]]]
    shortlist: Optional[List[Dict[str, Any]]]
    match_result: Optional[Dict[str, Any]]  # parsed MatchResult once produced
    validation_error: Optional[str]
    retry_count: int
    status: str  # "pending" | "matched" | "needs_review"
    db_manager: Optional[object]  # Optional injected DatabaseManager for testing / DI
