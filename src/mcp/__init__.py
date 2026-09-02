"""Argus MCP (Model Context Protocol) Server package."""
from .server import (
    mcp_server,
    get_pending,
    get_recent_postings,
    get_match,
    mark_interested,
    update_application_status,
)

__all__ = [
    "mcp_server",
    "get_pending",
    "get_recent_postings",
    "get_match",
    "mark_interested",
    "update_application_status",
]
