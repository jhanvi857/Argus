# Argus: Official ATS Job Posting Monitor and JD-to-Project Matcher

Argus is an automated career intelligence platform built to monitor official enterprise applicant tracking systems (ATS), filter for relevant software engineering roles, notify candidates through targeted email digests, and ground resume customizations in a candidate's verified project portfolio.

Aggregator portals (such as LinkedIn or Indeed) often surface stale, duplicate, or ghost postings. Argus bypasses aggregators entirely by interfacing directly with underlying JSON endpoints across 94 target company portals, maintaining an immutable snapshot record, and executing stateful LangGraph workflows for ingestion and semantic project matching.

---

## Table of Contents

1. System Architecture
2. n8n Orchestration Pipeline
3. Core Architectural Decisions (ADRs)
4. Data Pipeline and LangGraph Workflows
5. Database Schema
6. Target Company Directory
7. Model Context Protocol (MCP) Server
8. Community & Curated Prep Intelligence
9. Setup and Deployment
10. Test Suite Verification
11. License

---

## 1. System Architecture

The Argus platform comprises five distinct architectural layers operating across isolated containers connected through a private Docker bridge network:

```mermaid
graph TD
    A[n8n Automation Engine<br/>Cron & Webhook Orchestrator] -->|HTTP POST /run-ingestion| B[FastAPI Backend Service]
    A -->|Read Unnotified Postings| C[(PostgreSQL Database<br/>Source of Truth)]
    A -->|Mark Notified| C
    A -->|SMTP Dispatch| D[Candidate Verified Inbox]

    B -->|Network Ingestion| E[Enterprise ATS Platforms<br/>Greenhouse, Lever, Workday, etc.]
    B -->|Ingestion LangGraph| F[Groq Llama-3.3-70b<br/>Extract, Classify, Dedupe]
    B -->|Matcher LangGraph| G[Gemini 2.0 Flash<br/>Grounded Matcher with Retry Loop]
    B -->|Read / Write| C

    H[React TypeScript Frontend<br/>Vite + Nginx Reverse Proxy] -->|REST /api/*| B
    H -->|State & Offline Cache| I[Browser LocalStorage]

    J[Claude Desktop / AI Agents] -->|MCP stdio Protocol| K[Argus MCP Server<br/>5 Diagnostic Tools]
    K -->|Database Queries| C
    K -->|Run Matcher| B
```

### Component Summary

- **n8n Orchestrator**: Executes scheduled cron triggers and handles external webhooks. It acts strictly as an orchestration engine, delegating business logic to the backend and performing SMTP delivery.
- **FastAPI Backend (`argus-app`)**: Hosts the ATS ingestion pipeline, two separate LangGraph graphs, email OTP verification, and REST endpoints.
- **PostgreSQL Database (`argus-postgres`)**: Serves as the immutable source of truth for raw snapshot archives, parsed job postings, ground-truth candidate projects, semantic match results, and application tracking stages.
- **React Frontend (`argus-frontend`)**: Responsive single-page application providing job feed monitoring, real-time telemetry, interactive application lifecycle tracking, and project portfolio management.
- **MCP Server (`mcp_server.py`)**: Exposes live database and matcher operations to AI agents via the standard Model Context Protocol.

---

## 2. n8n Orchestration Pipeline

The n8n workflow manages the scheduled execution cycle, queries the database for freshly identified relevant opportunities, generates the digest, dispatches emails through SMTP, and marks postings as notified.

![n8n Workflow Pipeline](docs/images/n8n_workflow.png)

### Workflow Node Breakdown

1. **Schedule Trigger**: Fires on a configured cron schedule (every 2 hours) to initiate the scrape cycle.
2. **HTTP Request**: Sends an `HTTP POST` request to `http://app:8000/run-ingestion`, triggering the backend ATS adapter loop, diff engine, and Ingestion LangGraph across all configured companies.
3. **Execute a SQL query (`PostgreSQL`)**: Executes an SQL query against the primary database to pull genuinely new, relevant postings:
   ```sql
   SELECT 
       p.id, 
       p.title, 
       p.team, 
       p.url, 
       p.deadline, 
       p.first_seen_at, 
       c.name AS company_name, 
       c.ats_type 
   FROM postings p 
   JOIN companies c ON p.company_id = c.id 
   WHERE p.relevant = true 
     AND p.notified_at IS NULL 
     AND p.status != 'closed' 
   ORDER BY p.first_seen_at ASC;
   ```
4. **If**: Evaluates whether new unnotified postings were returned (`$input.all().length > 0`). If false, the execution terminates quietly to prevent inbox noise.
5. **Code in JavaScript**: Transforms returned job rows into a responsive, clean HTML digest email displaying company names, role titles, teams, deadlines, and direct official application links.
6. **Send an Email**: Uses candidate SMTP credentials to dispatch the compiled digest to the candidate's verified email address.
7. **Execute a SQL query1 (`Postgres - Mark Notified`)**: Updates the database to prevent duplicate alerts:
   ```sql
   UPDATE postings
   SET notified_at = NOW()
   WHERE id = ANY(ARRAY[{{ $json.posting_ids.join(',') }}]::integer[]);
   ```

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

## 5. Database Schema

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
        timestamp created_at
        timestamp updated_at
    }
```

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

## 8. Setup and Deployment

### 8.1 Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- Docker and Docker Compose
- PostgreSQL 16 (if running standalone without Docker)

### 8.2 Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Database Configuration
POSTGRES_DB=argus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/argus

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

## 9. Setup and Deployment

### 9.1 Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- Docker and Docker Compose
- PostgreSQL 16 (if running standalone without Docker)

### 9.2 Environment Configuration

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

# Email Notification & SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
NOTIFICATION_EMAIL_TO=candidate@example.com
NOTIFICATION_EMAIL_FROM=argus-alerts@example.com
```

### 9.3 Running the Full Stack with Docker Compose

To boot PostgreSQL, the FastAPI backend, n8n, and the frontend web server simultaneously:

```bash
docker compose up -d --build
```

Access points:
- Frontend UI: `http://localhost:3000` (or `http://localhost:5173` in local Vite dev mode)
- Backend API Docs: `http://localhost:8000/docs`
- n8n Automation Console: `http://localhost:5678`
- PostgreSQL: `localhost:5432`

### 9.4 Local Development Setup

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

## 10. Test Suite Verification

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
built in 5.43s with 0 TypeScript errors
```

---

## 11. License

Argus is developed for automated career monitoring and job-to-project matching under the MIT License.

