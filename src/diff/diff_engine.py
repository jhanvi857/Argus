"""Diff engine for comparing newly scraped ATS postings against stored database state."""
from typing import Dict, List, Set, Union, Optional
from pydantic import BaseModel, Field

from src.adapters.models import ExtractedPosting
from src.db.models import Posting


class DiffResult(BaseModel):
    """Encapsulates the differential changes between old and new ATS snapshots."""

    new_postings: List[ExtractedPosting] = Field(default_factory=list)
    updated_postings: List[ExtractedPosting] = Field(default_factory=list)
    unchanged_postings: List[ExtractedPosting] = Field(default_factory=list)
    closed_external_ids: List[str] = Field(default_factory=list)

    @property
    def has_changes(self) -> bool:
        """Returns True if there are any new, updated, or closed postings."""
        return bool(self.new_postings or self.updated_postings or self.closed_external_ids)

    @property
    def total_current_count(self) -> int:
        """Returns the total number of currently active postings in latest scrape."""
        return len(self.new_postings) + len(self.updated_postings) + len(self.unchanged_postings)


class DiffEngine:
    """Computes differences between previous snapshot state and newly fetched postings."""

    @staticmethod
    def diff(
        previous_postings: Union[List[Posting], Dict[str, Posting]],
        current_postings: List[ExtractedPosting],
    ) -> DiffResult:
        """Compares previous postings with current extracted postings.

        Args:
            previous_postings: List or dict of existing Posting records from database/snapshot.
            current_postings: List of ExtractedPosting records from latest ATS fetch.

        Returns:
            DiffResult containing classified new, updated, unchanged, and closed postings.
        """
        if isinstance(previous_postings, list):
            prev_map: Dict[str, Posting] = {p.external_id: p for p in previous_postings}
        else:
            prev_map = previous_postings

        new_list: List[ExtractedPosting] = []
        updated_list: List[ExtractedPosting] = []
        unchanged_list: List[ExtractedPosting] = []

        seen_external_ids: Set[str] = set()

        for curr in current_postings:
            ext_id = curr.external_id
            seen_external_ids.add(ext_id)

            if ext_id not in prev_map:
                new_list.append(curr)
            else:
                prev = prev_map[ext_id]
                # Check for updates in key attributes
                has_changed = (
                    prev.title.strip() != curr.title.strip()
                    or (prev.team or "").strip() != (curr.team or "").strip()
                    or prev.url.strip() != curr.url.strip()
                )
                if has_changed:
                    updated_list.append(curr)
                else:
                    unchanged_list.append(curr)

        # Detect closed or removed postings
        closed_ids = [
            prev_id
            for prev_id in prev_map.keys()
            if prev_id not in seen_external_ids
        ]

        return DiffResult(
            new_postings=new_list,
            updated_postings=updated_list,
            unchanged_postings=unchanged_list,
            closed_external_ids=closed_ids,
        )
