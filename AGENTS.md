# Argus — Job Posting Monitor & JD-to-Project Matcher

## Context
I'm applying to 15+ SWE internship/new-grad roles (Google, Citadel, Goldman Sachs, JPMorgan Chase,
Microsoft, Stripe, Wells Fargo, Flipkart, PayPal, Walmart Global Tech, Razorpay, Salesforce, Amazon,
and others) and currently tracking everything manually — OA dates, referral status, which resume
version went where. Aggregator sites (LinkedIn, etc.) show stale or duplicate postings, so postings
must come from each company's own official career page / ATS.

## Problem this solves
Manual flow today: check each portal → inbox fills with irrelevant company mail → find a real JD →
read it → manually pick which project/skills to lead with → customize resume. This is the part to
automate away.

## Goal
1. Monitor a user-defined list of target companies by hitting their official ATS/career pages on a
   schedule — never LinkedIn or aggregators.
2. Diff against the last check; extract genuinely new postings.
3. Classify relevance against my preferred roles (SWE intern, infra/backend focus, given location).
4. Email me only when a relevant new posting appears (not every posting — kills inbox noise).
5. On my UI action "Interested", run an LLM-based matcher that reads the JD and recommends which of
   my own projects to feature and which keywords/skills to surface, using my real project portfolio
   as ground truth — not generic keyword matching.
6. Expose the tracker live via MCP so I (or Claude) can ask "what's pending for Goldman" and get a
   real answer from the database, not memory.

## Tech stack
- **n8n** — cron scheduling + email notification node (SMTP). Orchestration glue only, not where
  logic lives.
- **Python** — ATS adapters/scrapers, LangGraph agents.
- **LangGraph** — two separate graphs (see Architecture). Chosen over a single LangChain chain
  because there are two distinct stateful flows with different triggers.
- **Postgres** — source of truth for postings, my project portfolio, and match results.
- **MCP server** — thin wrapper exposing tracker/matcher as callable tools.
- **UI** — minimal feed: list of new relevant postings + "Interested" button + match result view.

## Architecture (pipeline order)
1. **n8n scheduler** — cron trigger, runs every few hours.
2. **ATS fetch adapter** — pulls JSON per company. Greenhouse/Lever expose clean public JSON
   directly; everything else (most big tech/finance — Workday, Avature, custom in-house) needs a
   per-company adapter found by inspecting the site's own network calls (devtools → Network → XHR/
   fetch while the jobs list loads) rather than scraping rendered HTML.
3. **Diff engine** — compares the new fetch against the last stored snapshot for that company;
   emits only new/changed postings.
4. **Ingestion LangGraph** (`ingestion_graph.py`, runs automatically on every new raw posting):
   - `extract_fields` — role title, team, deadline, location from raw HTML/JSON.
   - `classify_relevance` — LLM call against my stated role preferences; tags relevant/not.
   - `dedupe` — fuzzy match on title + company + rough date, catches the "same req reworded"
     aggregator-noise problem, separate from the exact `external_id` dedup key.
5. **Postgres write** — relevant new postings land in `postings`; if relevant, notifier fires.
6. **Email notifier** — n8n SMTP node, fires once per genuinely new relevant posting (dedup by
   `postings.notified_at` so it never re-fires).
7. **UI feed** — shows relevant postings; "Interested" button triggers step 8.
8. **Matcher LangGraph** (`matcher_graph.py`, runs on-demand only, per "Interested" click):
   - Pre-filter `projects` table by tag/keyword overlap with the JD (fast, deterministic, free).
   - LLM ranks and justifies within that shortlist only, constrained to return project IDs from the
     fixed list (never free-text project names) plus a short rationale and suggested keywords.
   - Result written to `matches`.
9. **MCP server** — `get_pending(company)`, `get_recent_postings(days)`, `get_match(posting_id)`,
   `mark_interested(posting_id)`, `update_application_status(...)`.

## Database schema
```sql
companies(id, name, ats_type, ats_url, careers_page_url, last_checked_at)

postings(
  id, company_id, external_id, title, team, deadline, url,
  first_seen_at, last_seen_at, raw_json,
  status,        -- new | reviewed | applied | ignored
  relevant,      -- bool, from classify_relevance
  notified_at    -- null until email sent, prevents re-notification
)

projects(
  id, name, tech_stack, tags, summary, quantified_bullets, resume_variants
)  -- seed with my real portfolio: NioFlow, Evora, GitResolve, DocStream, CloudWeave,
   -- Meridian, Arbiter, Vexor, Substrate, Aegis, Streamify

matches(
  id, posting_id, recommended_project_ids, rationale, suggested_keywords, created_at
)

applications(
  id, posting_id, resume_version, oa_date, referral_status, stage, notes, updated_at
)

snapshots(company_id, fetched_at, raw_payload)  -- always keep raw payload for re-extraction
                                                  -- if a company changes page structure
```

## Config files
`config/companies.yaml`
```yaml
- name: Goldman Sachs
  ats_type: custom     # confirm via devtools
  careers_page_url: https://...
  role_filter: ["Summer Analyst", "Technology", "APAC"]
- name: Stripe
  ats_type: greenhouse  # verify, don't assume
  careers_page_url: https://stripe.com/jobs
```

`db/seed_projects.sql` — populate from my actual project details (tech stack, quantified metrics,
tags like "distributed-systems", "high-throughput", "Go", "Java", "consensus", "storage").

## Build phases
1. **Schema + seed portfolio** — create all tables, populate `projects` with real data. This is the
   matcher's ground truth and the highest-leverage piece to get right first.
2. **companies.yaml** — target company list with URLs and role filters.
3. **One working adapter + diff loop** — single company, JSON → `snapshots` → diff → `postings`,
   end to end, before building anything else.
4. **n8n cron + email notifier** — scheduler wired to the adapter; SMTP node fires only on relevant
   new postings.
5. **Ingestion LangGraph** — extract → classify → dedupe, running automatically per scrape.

Split them by task rather than picking one for everything — the two graphs have different needs:

**Groq for Phase 5 (ingestion — extract/classify/dedupe)**: this runs automatically every cron cycle across ~40 companies, is a simpler judgment call ("is this posting relevant," pull a few fields), and latency doesn't matter much since nothing's waiting on it synchronously. Groq's free tier gives you far more daily headroom (up to 14,400 requests/day vs Gemini's 1,500) and it's dramatically faster — good fit for a high-volume, low-complexity job.

**Gemini for Phase 6 (matcher — "Interested" click)**: this is low-volume (you'll trigger it a handful of times a day, so Gemini's lower ceiling is a non-issue) but needs real judgment — deciding which project genuinely fits a specific JD and writing a sound rationale isn't just classification. Gemini's Flash models are generally the stronger reasoner of the two free options for that kind of nuanced call; Groq's strength is speed on open-weight models, not necessarily the best semantic matching.

This is also the actual case where reconsidering `langchain-google-genai` + `langchain-groq` together makes sense — not as a fallback, but because you're intentionally running two providers, and LangChain's `with_structured_output()` gives you one interface instead of writing two separate parsing paths.

If you'd rather not manage two API keys for a personal project, Gemini alone is the safer single choice — its rate ceiling comfortably covers your actual posting volume (a handful of genuinely new postings/day, not thousands), and you avoid the reasoning-quality question entirely.

6. **Matcher LangGraph (reframed)**

Note: this is Phase 6 (Interested UI & Matcher LangGraph) per the original roadmap, not Phase 5.
Phase 5 (Ingestion LangGraph — extract_fields → classify_relevance → dedupe, runs automatically
on every scrape) is separate and unaffected by this.

## What changed from the original scoping
1. Every step is a LangGraph node, not just the LLM step — "plain Python" describes what's
   inside a node, not whether it counts as one.
2. The validate → retry cycle is now explicit. Without it this is just a linear script and
   LangGraph isn't earning its keep.
3. LLM provider is Gemini (or Groq), not Claude — no ongoing free API tier on Claude.
4. LangChain's job is scoped to exactly one node (`match_with_llm`): build prompt, call the LLM,
   parse the response. It is not a competing framework to LangGraph.
5. A termination path exists for repeated validation failure — `needs_review`, not an infinite
   loop or a silent drop.

## State schema
```python
from typing import TypedDict, Optional

class MatcherState(TypedDict):
    posting_id: str
    job_data: Optional[dict]
    portfolio: Optional[list[dict]]
    shortlist: Optional[list[dict]]
    match_result: Optional[dict]      # parsed MatchResult once produced
    validation_error: Optional[str]
    retry_count: int
    status: str                       # "pending" | "matched" | "needs_review"
```

## Nodes
1. `load_job` — plain Python. Fetch the posting row + raw_json from Postgres by `posting_id`.
2. `load_portfolio` — plain Python. Fetch `projects`/`skills`/`achievements`.
3. `prefilter_projects` — plain Python. Tag/keyword overlap between `job_data` and portfolio →
   `shortlist`. No LLM call.
4. `match_with_llm` — the only node that calls an LLM.
   - LangChain inside this node only: build prompt (job + shortlist) → call Gemini/Groq →
     `PydanticOutputParser` wrapped in `OutputFixingParser` for auto-repair on malformed output.
   - Increments `retry_count` on each entry (including re-entries from the retry edge).
5. `validate_result` — plain Python. Re-checks the parse succeeded, and — the real check —
   that every `recommended_project_id` is inside `shortlist`'s ids, not just any real project.
   Sets `validation_error` on failure.
6. `save_result` — plain Python. Writes to `matches`, sets `status = "matched"`.
7. `needs_review` — plain Python. Writes `status = "needs_review"` with the last
   `validation_error` attached, so it surfaces in the UI for you to check manually instead of
   vanishing silently.

## Edges
```
START → load_job → load_portfolio → prefilter_projects → match_with_llm → validate_result
                                                                                  │
                                                        ┌─────────────────────────┼──────────────────┐
                                                     pass                    fail, retry<3        fail, retry≥3
                                                        │                         │                    │
                                                  save_result → END        match_with_llm         needs_review → END
                                                                            (loop back)
```

## Graph wiring
```python
from langgraph.graph import StateGraph, END

graph = StateGraph(MatcherState)
graph.add_node("load_job", load_job)
graph.add_node("load_portfolio", load_portfolio)
graph.add_node("prefilter_projects", prefilter_projects)
graph.add_node("match_with_llm", match_with_llm)
graph.add_node("validate_result", validate_result)
graph.add_node("save_result", save_result)
graph.add_node("needs_review", needs_review)

graph.set_entry_point("load_job")
graph.add_edge("load_job", "load_portfolio")
graph.add_edge("load_portfolio", "prefilter_projects")
graph.add_edge("prefilter_projects", "match_with_llm")
graph.add_edge("match_with_llm", "validate_result")

def route_after_validation(state: MatcherState) -> str:
    if not state["validation_error"]:
        return "save_result"
    if state["retry_count"] < 3:
        return "match_with_llm"
    return "needs_review"

graph.add_conditional_edges("validate_result", route_after_validation, {
    "save_result": "save_result",
    "match_with_llm": "match_with_llm",
    "needs_review": "needs_review",
})
graph.add_edge("save_result", END)
graph.add_edge("needs_review", END)

matcher_graph = graph.compile()
```

## LLM call inside match_with_llm
```python
from langchain.output_parsers import PydanticOutputParser, OutputFixingParser
from langchain_google_genai import ChatGoogleGenerativeAI

parser = PydanticOutputParser(pydantic_object=MatchResult)
fixer = OutputFixingParser.from_llm(
    parser=parser,
    llm=ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite"),
)

def match_with_llm(state: MatcherState) -> MatcherState:
    state["retry_count"] += 1
    prompt = build_prompt(state["job_data"], state["shortlist"])
    raw = fixer.parser.get_format_instructions()  # inject into prompt if not using tool-calling
    response = fixer.llm.invoke(prompt)
    state["match_result"] = fixer.parse(response.content).model_dump()
    return state
```

## Non-functional
- `needs_review` should show a badge in the UI — the whole point of this branch is that you
  notice, not that it's handled invisibly.
- Cap of 3 retries is a starting point, not fixed — raise it only if you see genuine transient
  failures (rate limits) rather than the model consistently picking ungrounded project IDs, which
  a retry won't fix and instead points at the prompt or shortlist quality.
7. **MCP server** — wrap the query/mutation functions as tools.
8. **Repeat adapters per remaining company** — the actual bulk of ongoing work; each non-Greenhouse/
   Lever company needs its own reverse-engineered endpoint.

## Non-functional requirements
- Backoff/rate-limit on ATS calls — enterprise ATS platforms may rate-limit or need session
  cookies/CSRF tokens for internal endpoints.
- Never scrape rendered HTML for JS-rendered career pages — hit the underlying API the page itself
  calls, or you'll get an empty shell.
- Keep raw payloads in `snapshots` indefinitely — adapters break silently when a company changes
  page structure; raw data lets you re-run extraction without re-fetching.
- Matcher must return only project IDs from the fixed list, never invent a project name — this is
  the hallucination guardrail.