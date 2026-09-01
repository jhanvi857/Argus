"""FastAPI HTTP endpoint exposing ATS ingestion triggers for n8n orchestrator."""
from fastapi import FastAPI
from src.pipeline.ingestion_service import run_all

app = FastAPI(
    title="Argus Ingestion API",
    description="HTTP trigger service for n8n to execute ATS scraping, diffing, and relevance classification.",
    version="1.0.0",
)


@app.get("/health")
def health():
    """Healthcheck endpoint for Docker container orchestration."""
    return {"status": "healthy"}


@app.post("/run-ingestion")
def trigger():
    """Triggers end-to-end ATS ingestion loop for all configured target companies."""
    result = run_all()
    successful = sum(1 for r in result if r.get("status") == "success")
    total_new_relevant = sum(r.get("relevant_postings", 0) for r in result if r.get("status") == "success")
    return {
        "status": "ok",
        "companies_checked": len(result),
        "successful_count": successful,
        "new_relevant_count": total_new_relevant,
        "results": result,
    }
