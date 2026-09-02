"""Ingestion pipeline executing ATS fetch -> Snapshot persistence -> Diff -> Postings write."""
from typing import Optional, Union, List, Dict, Any
import logging
from pydantic import BaseModel, Field

from src.db.db_manager import DatabaseManager
from src.db.models import Company, Posting
from src.config.companies import CompanyConfig, load_companies_config
from src.adapters.base import BaseAdapter
from src.adapters.models import ExtractedPosting
from src.adapters.registry import get_adapter
from src.diff.diff_engine import DiffEngine, DiffResult

from src.graphs.ingestion_graph import process_new_posting

logger = logging.getLogger(__name__)


class IngestionResult(BaseModel):
    """Execution telemetry and results of an ATS ingestion run."""

    company_id: int
    company_name: str
    snapshot_id: int
    new_count: int
    relevant_count: int
    duplicate_count: int
    updated_count: int
    unchanged_count: int
    closed_count: int
    diff_result: DiffResult


class IngestionPipeline:
    """End-to-end ingestion runner for ATS jobs fetching, snapshotting, and diffing."""

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()

    def run_for_company(
        self,
        company: Union[str, int, Company, CompanyConfig],
        adapter: Optional[BaseAdapter] = None,
    ) -> IngestionResult:
        """Executes full ATS ingestion loop for a single target company.

        1. Fetches raw payload from ATS adapter.
        2. Persists immutable raw payload in `snapshots` table.
        3. Parses job postings from raw payload.
        4. Diffs against existing postings in `postings` table.
        5. Runs each new posting through the Ingestion LangGraph
           (extract_fields → classify_relevance → dedupe).
        6. Inserts non-duplicate new postings with relevance tags.
        7. Silently updates modified active postings.
        8. Marks closed postings as status='closed'.
        9. Updates `companies.last_checked_at`.

        Args:
            company: Company name, ID, database model, or config entry.
            adapter: Optional pre-configured ATS adapter instance.

        Returns:
            IngestionResult with diff metrics and snapshot ID.
        """
        company_record = self._resolve_company(company)

        # Instantiate adapter if not provided
        if not adapter:
            adapter = get_adapter(
                company_name=company_record.name,
                careers_page_url=company_record.careers_page_url,
                ats_type=company_record.ats_type,
                ats_url=company_record.ats_url,
            )

        logger.info(f"[{company_record.name}] Fetching ATS payload via {adapter.__class__.__name__}...")
        raw_payload, extracted_postings = adapter.fetch_and_parse()

        # Step 2: Store snapshot in PostgreSQL
        snapshot_id = self.db.create_snapshot(company_record.id, raw_payload)
        logger.info(f"[{company_record.name}] Stored snapshot #{snapshot_id} ({len(extracted_postings)} postings parsed)")

        # Step 3: Fetch existing postings and run diff engine
        existing_postings = self.db.get_postings_for_company(company_record.id)
        diff_res = DiffEngine.diff(existing_postings, extracted_postings)

        # Step 4: Run new postings through Ingestion LangGraph
        relevant_count = 0
        duplicate_count = 0
        insertable_postings: List[ExtractedPosting] = []
        relevant_flags: List[bool] = []

        if diff_res.new_postings:
            catalog = load_companies_config()
            cfg = catalog.get_company_by_name(company_record.name)
            role_filter = cfg.role_filter if cfg else []

            for p in diff_res.new_postings:
                graph_result = process_new_posting(p, company_record, role_filter, db_manager=self.db)

                is_relevant = graph_result.get("is_relevant", False)
                is_duplicate = graph_result.get("is_duplicate", False)

                if is_duplicate:
                    duplicate_count += 1
                    dup_id = graph_result.get("duplicate_of_posting_id")
                    logger.info(
                        f"[{company_record.name}] DUPLICATE skipped: '{p.title}' "
                        f"(similar to posting #{dup_id})"
                    )
                    continue  # Don't insert duplicates

                insertable_postings.append(p)
                relevant_flags.append(is_relevant)
                if is_relevant:
                    relevant_count += 1
                    rationale = graph_result.get("classification_rationale", "")
                    logger.info(f"[{company_record.name}] RELEVANT MATCH: '{p.title}' ({rationale})")

            if insertable_postings:
                inserted_ids = self.db.insert_new_postings(
                    company_record.id, insertable_postings, relevant_flags=relevant_flags
                )
                logger.info(
                    f"[{company_record.name}] Inserted {len(inserted_ids)} new postings "
                    f"({relevant_count} relevant, {duplicate_count} duplicates skipped)"
                )

        if diff_res.updated_postings:
            for upd in diff_res.updated_postings:
                self.db.update_posting(company_record.id, upd)
            logger.info(f"[{company_record.name}] Updated {len(diff_res.updated_postings)} modified postings (silent DB update)")

        if diff_res.unchanged_postings:
            unchanged_ext_ids = [p.external_id for p in diff_res.unchanged_postings]
            self.db.update_postings_last_seen(company_record.id, unchanged_ext_ids)

        if diff_res.closed_external_ids:
            closed_count = self.db.mark_postings_closed(company_record.id, diff_res.closed_external_ids)
            logger.info(f"[{company_record.name}] Marked {closed_count} postings as closed")

        # Step 5: Update company check timestamp
        self.db.update_company_last_checked(company_record.id)

        return IngestionResult(
            company_id=company_record.id,
            company_name=company_record.name,
            snapshot_id=snapshot_id,
            new_count=len(diff_res.new_postings),
            relevant_count=relevant_count,
            duplicate_count=duplicate_count,
            updated_count=len(diff_res.updated_postings),
            unchanged_count=len(diff_res.unchanged_postings),
            closed_count=len(diff_res.closed_external_ids),
            diff_result=diff_res,
        )

    def _resolve_company(self, company: Union[str, int, Company, CompanyConfig]) -> Company:
        """Resolves various company representations into a stored database Company record."""
        if isinstance(company, Company) and company.id:
            return company

        if isinstance(company, int):
            rec = self.db.get_company_by_id(company)
            if not rec:
                raise ValueError(f"Company ID {company} not found in database")
            return rec

        name = company if isinstance(company, str) else company.name
        db_company = self.db.get_company_by_name(name)

        if db_company:
            return db_company

        # If not in DB, check companies.yaml configuration and auto-sync
        catalog = load_companies_config()
        cfg = catalog.get_company_by_name(name)
        if cfg:
            self.db.sync_companies_from_config()
            db_company = self.db.get_company_by_name(name)
            if db_company:
                return db_company

        raise ValueError(f"Company '{name}' could not be resolved from DB or config")


def run_all(pipeline: Optional[IngestionPipeline] = None) -> List[Dict[str, Any]]:
    """Executes the ingestion pipeline across all companies configured in companies.yaml.

    Returns:
        List of summary dicts containing per-company ingestion results.
    """
    pipe = pipeline or IngestionPipeline()
    catalog = load_companies_config()
    results: List[Dict[str, Any]] = []

    logger.info(f"Starting batch ingestion for {catalog.total_count} companies...")
    for comp in catalog.get_all_companies():
        try:
            res = pipe.run_for_company(comp)
            results.append(
                {
                    "company": comp.name,
                    "status": "success",
                    "new_postings": res.new_count,
                    "relevant_postings": res.relevant_count,
                    "duplicate_postings": res.duplicate_count,
                    "updated_postings": res.updated_count,
                    "active_postings": res.unchanged_count,
                    "closed_postings": res.closed_count,
                    "snapshot_id": res.snapshot_id,
                }
            )
            logger.info(
                f"[{comp.name}] Finished -> New: {res.new_count} ({res.relevant_count} relevant), Active: {res.unchanged_count}"
            )
        except Exception as ex:
            logger.error(f"[{comp.name}] Ingestion failed: {ex}", exc_info=True)
            results.append(
                {
                    "company": comp.name,
                    "status": "failed",
                    "error": str(ex),
                }
            )

    return results


if __name__ == "__main__":
    import argparse
    import sys

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Argus ATS Ingestion Pipeline")
    parser.add_argument("--company", type=str, help="Name of target company to scrape and diff")
    parser.add_argument("--all", action="store_true", help="Run ingestion for all configured companies")
    args = parser.parse_args()

    pipeline = IngestionPipeline()

    try:
        if args.company:
            print(f"Running ingestion pipeline for '{args.company}'...")
            res = pipeline.run_for_company(args.company)
            print("\n--- Ingestion Results ---")
            print(f"• Company: {res.company_name} (ID: {res.company_id})")
            print(f"• Snapshot ID: {res.snapshot_id}")
            print(f"• Genuinely New: {res.new_count} ({res.relevant_count} relevant, {res.duplicate_count} duplicates skipped)")
            print(f"• Updated: {res.updated_count}")
            print(f"• Unchanged (Active): {res.unchanged_count}")
            print(f"• Closed/Missing: {res.closed_count}")
        elif args.all:
            results = run_all(pipeline)
            success_count = sum(1 for r in results if r.get("status") == "success")
            print(f"\nCompleted batch ingestion: {success_count}/{len(results)} companies succeeded.")
        else:
            parser.print_help()
            sys.exit(0)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)



