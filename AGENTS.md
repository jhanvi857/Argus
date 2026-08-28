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
6. **Interested UI + matcher LangGraph** — feed + button; on click, tag-prefilter → LLM rank/justify
   with structured project-ID output → write to `matches`.
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