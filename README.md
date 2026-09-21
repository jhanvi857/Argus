# Argus: Official ATS Job Posting Monitor and JD-to-Project Matcher

Argus is an automated career intelligence platform built to monitor official enterprise applicant tracking systems (ATS), filter for relevant software engineering roles, notify candidates through targeted email digests, and ground resume customizations in a candidate's verified project portfolio.

Aggregator portals (such as LinkedIn or Indeed) often surface stale, duplicate, or ghost postings. Argus bypasses aggregators entirely by interfacing directly with underlying JSON endpoints across 94 target company portals, maintaining an immutable snapshot record, and executing stateful LangGraph workflows for ingestion and semantic project matching.

---

## Table of Contents

- [1. System Architecture](#1-system-architecture)
- [2. Orchestration: Local Dev (n8n) vs. Production (Cron + Resend)](#2-orchestration-local-dev-n8n-vs-production-cron--resend)
- [3. Core Architectural Decisions (ADRs)](#3-core-architectural-decisions-adrs)
- [4. Data Pipeline and LangGraph Workflows](#4-data-pipeline-and-langgraph-workflows)
- [5. Database Schema & User Preferences](#5-database-schema--user-preferences)
- [6. Target Company Directory](#6-target-company-directory)
- [7. Model Context Protocol (MCP) Server](#7-model-context-protocol-mcp-server)
- [8. Community & Curated Prep Intelligence](#8-community--curated-prep-intelligence)
- [9. Monitoring Preferences & Differential Filtering](#9-monitoring-preferences--differential-filtering)
- [10. Setup and Deployment](#10-setup-and-deployment)
- [11. Test Suite Verification](#11-test-suite-verification)
- [12. License](#12-license)

---

## 1. System Architecture

The Argus platform is architected with dual deployment profiles: a lean production architecture driven by GitHub Actions cron and Resend, alongside an interactive local development environment powered by n8n:

```mermaid
graph TD
    subgraph Production Pipeline [Production: Lean Cron + Resend]
        GHA[GitHub Actions Cron<br/>schedule: 0 */4 * * *] -->|HTTP POST /digest/run| B[FastAPI Backend Service]
        B -->|Resend REST API| RESEND[Resend Email Delivery]
        RESEND --> D[Candidate Verified Inbox]
    end

    subgraph Local Dev Pipeline [Local Dev: n8n Orchestrator]
        A[n8n Automation Engine<br/>Local Dev & Visual Debugging] -.->|HTTP POST /run-ingestion| B
        A -.->|Read Unnotified Postings| C[(PostgreSQL Database<br/>Source of Truth)]
        A -.->|Mark Notified| C
        A -.->|SMTP Dispatch| D
    end

    subgraph Ingestion & Intelligence Core
        B -->|Network Ingestion| E[Enterprise ATS Platforms<br/>Greenhouse, Lever, Workday, etc.]
        B -->|Ingestion LangGraph| F[Groq Llama-3.3-70b<br/>Extract, Classify, Dedupe]
        B -->|Matcher LangGraph| G[Gemini 2.0 Flash<br/>Grounded Matcher with Retry Loop]
        B -->|Atomic Zero-Duplicate Claim| C
    end

    subgraph Interfaces
        H[React TypeScript Frontend<br/>Vite + Nginx Reverse Proxy] -->|REST /api/*| B
        H -->|State & Offline Cache| I[Browser LocalStorage]
        J[Claude Desktop / AI Agents] -->|MCP stdio Protocol| K[Argus MCP Server<br/>5 Diagnostic Tools]
        K -->|Database Queries| C
        K -->|Run Matcher| B
    end
```

### Component Summary

- **FastAPI Backend (`argus-app`)**: Hosts the ATS ingestion pipeline, two separate LangGraph graphs, email OTP verification, `/digest/run` production runner, and REST endpoints.
- **PostgreSQL Database (`argus-postgres`)**: Serves as the immutable source of truth for raw snapshot archives, parsed job postings, ground-truth candidate projects, semantic match results, and application tracking stages.
- **Resend Email Service**: Production delivery mechanism dispatching responsive job digests directly via HTTPS (`https://api.resend.com/emails`).
- **GitHub Actions Scheduled Trigger**: Production headless cron runner (`.github/workflows/scheduled_digest.yml`) executing periodic POST requests to `/digest/run` with bearer authentication.
- **n8n Orchestrator (`docker-compose.local.yml`)**: Local development container for visual workflow introspection, manual step testing, and payload validation.
- **React Frontend (`argus-frontend`)**: Responsive single-page application providing job feed monitoring, real-time telemetry, interactive application lifecycle tracking, and project portfolio management.
- **MCP Server (`mcp_server.py`)**: Exposes live database and matcher operations to AI agents via the standard Model Context Protocol.

---

## 2. Orchestration: Local Dev (n8n) vs. Production (Cron + Resend)

Argus separates deployment concerns cleanly between local development and production environments.

### The Trade-Off Explicitly

| Dimension | Local Dev (`n8n`) | Production (`cron` + Resend) |
|---|---|---|
| **Primary Purpose** | Visual workflow debugging, manual step re-execution, interactive payload inspection | Maximum uptime, minimal resource overhead, deterministic operations, zero credential drift |
| **Resource Footprint** | Heavy (+ ~500MB RAM, Node.js runtime, SQLite/n8n volume) | Lean (0 additional containers, 0 added RAM) |
| **Trigger Mechanism** | n8n internal cron node / webhook listener (`:5678`) | GitHub Actions cron (`schedule: '0 */4 * * *'`) or host crontab |
| **Email Dispatch** | n8n SMTP node via Resend SMTP | Direct Python HTTP POST to Resend REST API (`https://api.resend.com/emails`) |
| **Duplicate Prevention** | Sequential n8n workflow nodes (SELECT -> Send -> UPDATE) | Single atomic PostgreSQL transaction (`FOR UPDATE OF p SKIP LOCKED` + `UPDATE postings SET notified_at = NOW()`) |
| **Ops Complexity** | High (managing local volume permissions, node upgrades) | Zero (standard container stack deployed anywhere) |

### Why n8n for Local Dev?
During adapter development and prompt engineering, visual feedback is invaluable. n8n provides an intuitive node graph where you can:
- Inspect exact JSON payloads output by ATS adapters and diff engines in real time.
- Re-trigger individual nodes without executing the entire scraping loop.
- Manually edit HTML email templates and test SMTP dispatch interactively.

### Why Cron + Resend in Production?
In production, running a separate Node.js service (n8n) solely to trigger an HTTP endpoint every few hours is unnecessary operational overhead:
1. **Zero-Duplicate Guarantee via Atomic Transaction**: The production `/digest/run` endpoint queries and marks postings as notified within the **same PostgreSQL database transaction** using `FOR UPDATE OF p SKIP LOCKED`. Even under concurrent webhook triggers or retry attempts, the same posting is never notified twice.
2. **Cost & Simplicity**: Production requires only `postgres`, `app`, and `frontend`. No n8n volume management, database migrations, or Node.js memory leaks to monitor.
3. **Headless Execution**: A GitHub Actions workflow (`.github/workflows/scheduled_digest.yml`) or a standard Linux `crontab` periodically triggers `/digest/run` securely using an optional `CRON_SECRET`.

---

### Local Dev Workflow (with n8n)

To boot the full development stack including n8n:

```bash
# Start PostgreSQL, FastAPI, Frontend, and n8n together
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Access n8n at `http://localhost:5678`. The pre-configured workflow is automatically mounted from `./n8n/argus_workflow.json`.

![n8n Workflow Pipeline](docs/images/n8n_workflow.png)

#### n8n Local Workflow Node Breakdown

1. **Schedule Trigger**: Fires periodically (e.g. every 2 hours) to trigger the local dev test cycle.
2. **HTTP Request**: Sends `POST http://app:8000/run-ingestion`, triggering the backend adapter loop, diff engine, and LangGraph classifier.
3. **Execute a SQL query (`PostgreSQL`)**: Queries unnotified relevant postings:
   ```sql
   SELECT 
       p.id, p.title, p.team, p.url, p.deadline, p.first_seen_at, 
       c.name AS company_name, c.ats_type 
   FROM postings p 
   JOIN companies c ON p.company_id = c.id 
   WHERE p.relevant = true 
     AND p.notified_at IS NULL 
     AND p.status != 'closed' 
   ORDER BY p.first_seen_at ASC;
   ```
4. **If**: Evaluates `$input.all().length > 0` to prevent blank alert dispatches.
5. **Code in JavaScript**: Transforms job rows into an HTML digest preview.
6. **Send an Email**: Dispatches via local SMTP credentials.
7. **Execute a SQL query1 (`Postgres - Mark Notified`)**: Updates `notified_at = NOW()`.

---

### Production Workflow (Headless Cron + Resend)

In production, deploy only the base `docker-compose.yml`:

```bash
# Production deployment (No n8n overhead, saves ~500MB RAM)
docker compose up -d --build
```

The production pipeline is triggered via the headless `/digest/run` endpoint:

```bash
# Manually trigger production digest (or curl via cron)
curl -X POST "https://your-domain.com/digest/run" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

#### GitHub Actions Scheduled Trigger

Argus includes an automated production cron workflow at [`.github/workflows/scheduled_digest.yml`](.github/workflows/scheduled_digest.yml):
- **Schedule**: Executes automatically every 4 hours (`0 */4 * * *`).
- **Manual Trigger**: Supports manual trigger with optional `to_email` override via the GitHub Actions UI.
- **Required Repository Secrets**:
  - `ARGUS_API_URL`: Base URL of your deployed FastAPI app (e.g., `https://api.argus.yourdomain.com`).
  - `ARGUS_CRON_SECRET`: Secret token matching `CRON_SECRET` on your FastAPI server.

---

## 3. Core Architectural Decisions (ADRs)

### ADR 1: Direct Network API Reverse Engineering vs HTML Scraping

- **Context**: Aggregators like LinkedIn contain stale listings, expired requisitions, and re-posted agency jobs. Traditional career pages use heavy client-side JavaScript frameworks (React, Angular, Workday CXS), making raw HTML scraping fragile and prone to returning empty shells.
- **Decision**: Inspect network traffic (DevTools XHR/Fetch calls) to hit official backend APIs directly rather than rendering HTML. Built specialized adapters for Workday CXS, Amazon Jobs, Google Careers, Microsoft GCSServices, Goldman Sachs Enterprise, Eightfold AI, Greenhouse, and Lever.
- **Consequences**: Fast response times (typically under 200ms per company), structured JSON payloads without CSS selector breakage, and zero headless browser overhead.

### ADR 2: Two Separate LangGraph Graphs vs Single Monolithic Chain

- **Context**: Ingestion and matching have fundamentally different triggers, frequencies, and execution constraints. Ingestion runs automatically in batch every few hours across thousands of raw listings. Matching runs on-demand when a user clicks "Interested" on a specific role.
- **Decision**: Decoupled the logic into two stateful LangGraph workflows:
  1. `IngestionGraph` (`src/graphs/ingestion_graph.py`): Extract fields, classify relevance, and deduplicate.
  2. `MatcherGraph` (`src/graphs/matcher_graph.py`): Prefilter portfolio, LLM semantic rank, and validate with retry.
- **Consequences**: Independent scaling, failure isolation, and simpler unit testing for both paths.

### ADR 3: Provider Specialization: Groq vs Gemini

- **Context**: Ingestion processes high-volume, low-complexity classification tasks. Matching requires deep reasoning over engineering trade-offs, architecture decisions, and portfolio alignment.
- **Decision**:
  - **Groq (Llama-3.3-70b-versatile)**: Used for Phase 5 Ingestion. Provides high daily headroom (14,400 requests/day) and low latency for background batch processing.
  - **Gemini (gemini-2.0-flash)**: Used for Phase 6 Matcher. Offers superior semantic reasoning when mapping JDs to candidate experience bullets.
- **Consequences**: Maximizes free-tier rate limits while maintaining high output quality.

### ADR 4: Candidate Portfolio as Ground Truth (Hallucination Guardrail)

- **Context**: Generic LLM matchers frequently hallucinate technologies, exaggerate experience, or invent project names not present in the candidate's background.
- **Decision**: The candidate's verified project portfolio (`NioFlow`, `Evora`, `GitResolve`, etc.) is loaded into Postgres and acts as an immutable whitelist. The LLM is strictly constrained to return project IDs from this fixed candidate list.
- **Consequences**: Generated rationales and keyword recommendations remain 100 percent grounded in real, verifiable work.

### ADR 5: Bounded Validation Retry Loop with Human-in-the-Loop Fallback

- **Context**: LLM output parsers can fail or return ungrounded project slugs.
- **Decision**: If `validate_result` detects an ungrounded project ID, it increments `retry_count` and routes back to `match_with_llm` up to 3 times with feedback. If errors persist beyond 3 attempts, it terminates at `needs_review` rather than failing silently or looping infinitely.
- **Consequences**: Prevents ungrounded output from entering the database while surfacing difficult cases for manual candidate review.

### ADR 6: n8n as Orchestration Glue Only

- **Context**: Placing business logic inside n8n JavaScript nodes makes code difficult to test, version-control, and debug.
- **Decision**: Restrict n8n to cron scheduling, HTTP triggers, and SMTP dispatch. All diffing, parsing, classification, and database logic lives in Python modules with comprehensive unit test coverage.
- **Consequences**: Clean separation of concerns and maintainable, testable code.

### ADR 7: Immutable Raw Snapshot Archives

- **Context**: Enterprise career portals occasionally alter their API schemas or field names without notice.
- **Decision**: Store every raw payload in the `snapshots` table before running diffs or extraction.
- **Consequences**: If an adapter requires updates, past snapshots can be replayed and re-extracted without re-querying rate-limited endpoints.

### ADR 8: Mandatory Email OTP Verification Prior to Account Persistence

- **Context**: Storing unverified email accounts leads to invalid notification attempts, bounced emails, and fake profile creation.
- **Decision**: Authentication requires real-time 6-digit OTP email verification before inserting user records into PostgreSQL.
- **Consequences**: Eliminates invalid emails and guarantees notification delivery.

---

## 4. Data Pipeline and LangGraph Workflows

### 4.1 ATS Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant n8n as n8n Scheduler
    participant API as FastAPI Ingestion API
    participant Adapter as ATS Network Adapter
    participant DB as PostgreSQL Database
    participant LLM as Groq Llama-3.3-70b

    n8n->>API: POST /run-ingestion
    API->>Adapter: Fetch JSON payload
    Adapter->>DB: Store raw JSON in snapshots
    API->>DB: Query previous snapshot external_ids
    API->>API: Compute diff (new, updated, closed)
    loop For each genuinely new posting
        API->>LLM: IngestionGraph.extract_fields()
        API->>LLM: IngestionGraph.classify_relevance()
        API->>API: IngestionGraph.dedupe()
        API->>DB: Insert into postings (relevant flag set)
    end
    API-->>n8n: Return ingestion telemetry
    n8n->>DB: SELECT unnotified relevant postings
    n8n->>n8n: Format HTML digest
    n8n->>Candidate: Send SMTP Email Alert
    n8n->>DB: UPDATE postings SET notified_at = NOW()
```

### 4.2 Matcher LangGraph Workflow

The Matcher Graph runs on-demand when a user marks a role as "Interested" in the UI or triggers it via MCP:

```mermaid
stateDiagram-v2
    [*] --> load_job
    load_job --> load_portfolio: Fetch posting row & raw_json
    load_portfolio --> prefilter_projects: Fetch 11 candidate projects
    prefilter_projects --> match_with_llm: Keyword overlap shortlist
    match_with_llm --> validate_result: Gemini 2.0 Flash invoke & parse
    
    validate_result --> save_result: Valid project IDs in shortlist
    validate_result --> match_with_llm: Invalid & retry_count < 3
    validate_result --> needs_review: Invalid & retry_count >= 3
    
    save_result --> [*]: status = matched
    needs_review --> [*]: status = needs_review
```

---

## 5. Database Schema & User Preferences

The database schema is defined in `db/schema.sql` and initialized automatically on startup:

```mermaid
erDiagram
    COMPANIES ||--o{ POSTINGS : publishes
    COMPANIES ||--o{ SNAPSHOTS : archives
    COMPANIES ||--o{ PREP_RESOURCES : collects
    COMPANIES ||--o{ EXPERIENCE_LOGS : references
    POSTINGS ||--o| MATCHES : receives
    POSTINGS ||--o| APPLICATIONS : tracks
    USERS ||--o{ APPLICATIONS : manages
    USERS ||--o{ EXPERIENCE_LOGS : authors

    COMPANIES {
        serial id PK
        varchar name UK
        varchar ats_type
        text ats_url
        text careers_page_url
        timestamp last_checked_at
        timestamp created_at
        timestamp updated_at
    }

    POSTINGS {
        serial id PK
        integer company_id FK
        varchar external_id
        varchar title
        varchar team
        varchar location
        varchar deadline
        text url
        timestamp first_seen_at
        timestamp last_seen_at
        jsonb raw_json
        varchar status
        boolean relevant
        timestamp notified_at
        timestamp updated_at
    }

    PROJECTS {
        varchar id PK
        varchar name
        text_array tech_stack
        text_array tags
        text summary
        text_array quantified_bullets
        jsonb resume_variants
        timestamp created_at
    }

    MATCHES {
        serial id PK
        integer posting_id FK
        text_array recommended_project_ids
        text rationale
        text_array suggested_keywords
        timestamp created_at
    }

    APPLICATIONS {
        serial id PK
        integer posting_id FK
        varchar stage
        varchar oa_date
        varchar referral_status
        varchar resume_version
        text notes
        timestamp updated_at
    }

    EXPERIENCE_LOGS {
        serial id PK
        integer company_id FK
        integer posting_id FK
        integer application_id FK
        uuid author_user_id FK
        varchar stage
        text technical_questions
        text takeaways
        jsonb offer_details
        varchar visibility
        varchar author_display_mode
        boolean verified_applicant
        boolean confidentiality_ack
        timestamp created_at
    }

    PREP_RESOURCES {
        serial id PK
        integer company_id FK
        integer posting_id FK
        varchar stage
        varchar title
        text snippet
        varchar source
        text url
        timestamp fetched_at
    }

    SNAPSHOTS {
        serial id PK
        integer company_id FK
        timestamp fetched_at
        jsonb raw_payload
    }

    USERS {
        serial id PK
        varchar email UK
        varchar name
        boolean is_verified
        boolean is_active
        jsonb preferences
        timestamp created_at
        timestamp updated_at
    }
```

### User Preferences Schema (`users.preferences`)
Candidate search filters and notification settings are stored as structured JSONB in `users.preferences`:
- `candidate_stage`: Current career status (e.g. `College Student`, `Recent Graduate`, `Early Career`).
- `candidate_stage_detail`: Focus description (e.g. `Seeking internships & co-ops`).
- `target_roles`: Monitored role types (e.g. `["Internships", "New Grad"]`).
- `role_level`: Normalized level filter (`all`, `intern`, `new_grad`, `experienced`).
- `locations`: Monitored countries list (e.g. `["India", "United States", "Canada", "United Kingdom"]`).
- `target_company_ids`: Whitelist of monitored employer IDs mapped to official ATS platforms.
- `email_notifications_enabled`: Notification dispatch toggle (`true` / `false`).
- `minimum_relevance`: Relevance cutoff score (e.g. `80%`).
- `posting_freshness_days`: Freshness window for new opportunities (e.g. `7` days).
- `delivery_frequency`: Delivery cadence (`Instant` per posting or `Daily Digest`).
- `last_updated_at`: Timestamp of last preference synchronization.

---

## 6. Target Company Directory

Argus monitors 94 tier-1 companies structured into eight distinct sectors in `config/companies.yaml`:

| Tier Name | Key | Total Companies | Supported ATS Platforms | Primary Assessment Platforms |
|---|---|:---:|---|---|
| **FAANG / MAANG** | `faang_maang` | 6 | Google, Amazon, Greenhouse, Microsoft, Custom | HackerRank, CoderPad, Proprietary |
| **Quant / HFT** | `quant_and_hft` | 13 | Greenhouse, Lever, Custom | HackerRank, CodeSignal, Math Tests |
| **Global Fintech** | `global_fintech` | 6 | Greenhouse, Workday, Custom | HackerRank, CoderPad |
| **Indian Fintech** | `indian_fintech` | 7 | Lever, Greenhouse, Custom | HackerEarth, HackerRank |
| **Indian Product Unicorns** | `indian_product_unicorns` | 16 | Lever, Greenhouse, Custom | HackerEarth, CodeSignal |
| **Enterprise MNCs** | `enterprise_mnc` | 26 | Workday, Goldman Sachs, Eightfold, Greenhouse | HackerRank, CodeSignal, SHL |
| **Chips / Systems / Infra** | `chips_systems_infra` | 9 | Workday, Greenhouse, Custom | HackerRank, Technical Interviews |
| **Growth Stage Startups** | `growth_stage_startups` | 11 | Greenhouse, Lever, Custom | HackerRank, CoderPad |

---

## 7. Model Context Protocol (MCP) Server

Argus exposes a standard Model Context Protocol server over stdio, enabling Claude Desktop or AI pair programmers to query live job tracking data directly.

### Registered Tools

1. `get_pending(company: Optional[str] = None)`
   Retrieves roles in `new` or `reviewed` status, or active applications pending interview rounds.
2. `get_recent_postings(days: int = 7, company: Optional[str] = None)`
   Queries genuine postings identified by the diff engine within the specified time window.
3. `get_match(posting_id: int)`
   Returns stored semantic matches, recommended project IDs, and skill keywords.
4. `mark_interested(posting_id: int)`
   Executes the Phase 6 Matcher LangGraph pipeline on-demand and returns the grounded match recommendation.
5. `update_application_status(posting_id: int, stage: str, notes: Optional[str], oa_date: Optional[str], referral_status: Optional[str], resume_version: Optional[str])`
   Updates the application lifecycle status in Postgres.

### Connecting to Claude Desktop

Add this configuration to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "argus": {
      "command": "python",
      "args": ["-m", "src.mcp.server"],
      "cwd": "C:/Users/family/OneDrive/Desktop/Argus",
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/argus"
      }
    }
  }
}
```

---

## 8. Community & Curated Prep Intelligence

Argus unifies internal candidate interview logs with curated external debriefs in a unified **Experiences Panel** without aggregator noise or credit limits:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VIEW EXPERIENCES PANEL                          │
├────────────────────────────────────────────────────────────────────────┤
│  [All (12)]   [OA Breakdown (4)]   [Technical (5)]   [Offers (3)]      │
│  [Source: All]   [Source: Community Only]   [Source: Curated Prep]     │
├────────────────────────────────────────────────────────────────────────┤
│  • Community Debrief [Jordan Lee • Verified Applicant • OA]            │
│    "Sliding window maximum with monotonic queue. 60 min time limit."   │
│                                                                        │
│  • Curated Prep [LeetCode Discuss • Technical Round 1]                 │
│    "Design lock-free sliding window rate limiter in C++ with CAS."     │
│    Origin: https://leetcode.com/discuss/interview-experience/...       │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Highlights:
- **Zero Hallucination Community Schema**: Extends `experience_logs` with explicit `visibility` (`private` / `shared`), `author_display_mode` (`named` / `anonymous`), and automated verification checks (`verified_applicant`).
- **Strict NDA & Privacy Controls**: Mandatory non-disclosure agreement acknowledgment before submission. Author email addresses are never returned in public queries.
- **Curated Knowledge Base**: Pre-seeded with 48+ real, authentic 2022–2026 interview breakdowns for top tier companies (Google, Citadel, Stripe, Goldman Sachs, Amazon, Microsoft, Uber, JPMorgan, etc.) from **LeetCode Discuss**, **TeamBlind**, and **GeeksforGeeks**.
- **Zero-Latency Offline Cache**: Automatically bundled in `frontend/src/data/default_prep_resources.json` for offline responsiveness.

---

## 9. Monitoring Preferences & Differential Filtering

Argus features a dedicated monitoring profile interface to configure differential ATS ingestion filters, target role thresholds, and notification delivery options with zero dummy data or placeholders.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              PREFERENCES                               │
│      Configure how Argus searches, filters, and alerts you.            │
├────────────────────────────────────────────────────────────────────────┤
│ [User] Profile: College Student · Seeking internships & co-ops         │
│ [Briefcase] Target Roles: [v Internships] [v New Grad] [ Experienced]  │
│ [Globe] Geography: 12 countries selected [India x] [US x] [Canada x]   │
│ [Building] Watchlist: 24 companies [Google x] [Microsoft x] [+20 more] │
│ [Mail] Email Alerts: Enabled · 80% Min Relevance · 7 Days Freshness    │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.1 Configuration Capabilities
1. **Profile**: Candidate career stage and goals (`College Student`, `Recent Graduate`, `Early Career`, `Experienced`).
2. **Target Roles**: Multi-select pills (`Internships`, `New Grad`, `Experienced`) enforcing strict filtering so non-matching levels are excluded from notifications.
3. **Geography**: Monitored country watchlist with individual tag removal (`India`, `United States`, `Canada`, `United Kingdom`, `+N more`) and searchable directory.
4. **Company Watchlist**: Tracked enterprise employers mapped to verified ATS endpoints with brand monogram badges and interactive search selector across all database companies.
5. **Email Alerts**: Toggle notifications, select relevance cutoff (e.g. 70%, 75%, 80%, 85%, 90%), posting freshness window (1 to 30 days), and delivery timing (`Instant` / `Daily Digest`).

### 9.2 Monitoring Flow Pipeline
```
[1. Apply Profile Filters]
    --> Career stage, roles, geography
[2. Match with Job Postings]
    --> Partnered platforms & reverse-engineered official ATS endpoints
[3. Apply Differential Filters]
    --> Target company watchlist, minimum relevance threshold (> 80%)
[4. Trigger Alerts]
    --> New verified opportunity match identified
[5. Deliver via Email]
    --> Instant dispatch or scheduled digest via SMTP
```

### 9.3 Backend Persistence & State Management
- Unsaved changes trigger a floating bottom action bar with `Cancel` (revert) and `Save Preferences` (commit).
- Saves directly to the PostgreSQL `users.preferences` JSONB column via `POST /auth/preferences`.
- Automatically synchronized across ingestion cycles and application startup via `GET /auth/preferences`.

---

## 10. Setup and Deployment

### 10.1 Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- Docker and Docker Compose
- PostgreSQL 16 (if running standalone without Docker)

### 10.2 Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Database Configuration
POSTGRES_DB=argus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/argus

# LLM API Keys
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Backend & Frontend URL Configuration (Localhost or Cloud Deployment)
BACKEND_URL=http://localhost:8000
VITE_BACKEND_URL=http://localhost:8000

# Resend Email Configuration (Localhost & Production Deployment)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=Argus <onboarding@resend.dev>
NOTIFICATION_EMAIL_TO=candidate@example.com
NOTIFICATION_EMAIL_FROM=Argus <onboarding@resend.dev>

# Optional Resend SMTP Fallback (for n8n or legacy mailers)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_your_resend_api_key_here

# Production Scheduled Trigger Security (Optional)
CRON_SECRET=your_secure_cron_secret_here
```

### 10.3 Running Production Stack (Headless Cron + Resend)

To boot the lean production stack (PostgreSQL, FastAPI backend, and Frontend UI) without n8n:

```bash
docker compose up -d --build
```

Access points:
- Frontend UI: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Triggering production digest:
```bash
curl -X POST "http://localhost:8000/digest/run" -H "Content-Type: application/json"
```

### 10.4 Running Local Development Stack (with n8n)

To boot PostgreSQL, FastAPI, Frontend, and the n8n interactive automation console simultaneously:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

Access points:
- Frontend UI: `http://localhost:3000` (or `http://localhost:5173` in local Vite dev mode)
- Backend API Docs: `http://localhost:8000/docs`
- n8n Automation Console: `http://localhost:5678`
- PostgreSQL: `localhost:5432`

### 10.5 Native Development Setup (without Docker)

If running components natively without Docker:

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Initialize database schema, projects, and curated prep resources
python -m src.db.db_manager --init
python -m src.db.db_manager --seed
python -m src.db.db_manager --sync-companies
python -m src.db.seed_prep

# 3. Start FastAPI server
uvicorn src.pipeline.api:app --host 0.0.0.0 --port 8000 --reload

# 4. In a separate terminal, run the frontend
cd frontend
npm install
npm run dev
```

---

## 11. Test Suite Verification

The project includes an extensive test suite covering configuration loading, database adapters, the ingestion pipeline, LangGraph state machines, Phase 8 enterprise adapters, the MCP server, experience logs, and end-to-end integration:

```bash
# Run all unit and integration tests
python -m unittest discover tests
```

Output:
```
Ran 113 tests in 16.233s
OK
```

Frontend production verification:
```bash
cd frontend
npm run build
```
Output:
```
built in 6.58s with 0 TypeScript errors
```

---

## 12. License

Argus is developed for automated career monitoring and job-to-project matching under the MIT License.

