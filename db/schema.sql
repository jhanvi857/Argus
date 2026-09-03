-- Argus PostgreSQL Database Schema
-- Phase 1: Core Tables, Indexes, and Constraints

-- 1. Companies Table: Target companies monitored via official ATS/career pages
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ats_type VARCHAR(100) NOT NULL, -- e.g. 'greenhouse', 'lever', 'workday', 'custom'
    ats_url TEXT,
    careers_page_url TEXT NOT NULL,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Snapshots Table: Raw scrape payloads for re-extraction and diffing
CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    raw_payload JSONB NOT NULL
);

-- 3. Postings Table: Official job postings extracted and classified
CREATE TABLE IF NOT EXISTS postings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    team VARCHAR(255),
    deadline TIMESTAMPTZ,
    url TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    raw_json JSONB,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'applied', 'ignored', 'closed')),
    relevant BOOLEAN DEFAULT NULL, -- NULL = unclassified, TRUE = relevant, FALSE = irrelevant
    notified_at TIMESTAMPTZ DEFAULT NULL, -- NULL until email sent, prevents duplicate alerts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_company_external_id UNIQUE (company_id, external_id)
);

-- 4. Projects Table: Candidate portfolio ground truth for JD matching
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY, -- Slug identifier (e.g., 'nioflow', 'evora') used for hallucination-free LLM matching
    name VARCHAR(255) NOT NULL,
    tech_stack TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL,
    quantified_bullets TEXT[] NOT NULL DEFAULT '{}',
    resume_variants JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Matches Table: Recommendations and rationale linking JDs to candidate projects
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    posting_id INTEGER NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
    recommended_project_ids TEXT[] NOT NULL,
    rationale TEXT NOT NULL,
    suggested_keywords TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Applications Table: Tracking stages, OA dates, and resume variants per posting
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    posting_id INTEGER NOT NULL UNIQUE REFERENCES postings(id) ON DELETE CASCADE,
    resume_version VARCHAR(255),
    oa_date DATE,
    referral_status VARCHAR(50) DEFAULT 'none' CHECK (referral_status IN ('none', 'requested', 'referred', 'pending')),
    stage VARCHAR(50) DEFAULT 'applied' CHECK (stage IN ('bookmarked', 'applied', 'oa', 'phone_screen', 'technical_interview', 'onsite', 'offer', 'rejected', 'withdrawn')),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Users Table: Candidate account & recipient profile configuration
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Experience Logs Table: User-submitted interview logs & community knowledge sharing
CREATE TABLE IF NOT EXISTS experience_logs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    posting_id INTEGER REFERENCES postings(id) ON DELETE SET NULL,
    application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
    author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    stage VARCHAR(50) NOT NULL, -- 'applied', 'oa', 'phone_screen', 'technical_interview', 'onsite', 'offer', 'rejected'
    technical_questions TEXT,
    takeaways TEXT,
    offer_details TEXT,
    oa_date DATE,
    interview_date DATE,
    interview_round VARCHAR(255),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
    author_display_mode VARCHAR(20) DEFAULT 'named' CHECK (author_display_mode IN ('named', 'anonymous')),
    verified_applicant BOOLEAN DEFAULT FALSE,
    confidentiality_ack BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Prep Resources Table: External interview snippets pulled via Tavily (LeetCode, Blind, GfG)
CREATE TABLE IF NOT EXISTS prep_resources (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    posting_id INTEGER REFERENCES postings(id) ON DELETE SET NULL,
    stage VARCHAR(50),
    title VARCHAR(500),
    snippet TEXT NOT NULL,
    source VARCHAR(255) NOT NULL, -- e.g. 'LeetCode Discuss', 'TeamBlind', 'GeeksforGeeks'
    url TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & query optimization
CREATE INDEX IF NOT EXISTS idx_postings_company_id ON postings(company_id);
CREATE INDEX IF NOT EXISTS idx_postings_status ON postings(status);
CREATE INDEX IF NOT EXISTS idx_postings_relevant ON postings(relevant);
CREATE INDEX IF NOT EXISTS idx_postings_notified_at ON postings(notified_at);
CREATE INDEX IF NOT EXISTS idx_postings_first_seen_at ON postings(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_company_id ON snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_fetched_at ON snapshots(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_posting_id ON matches(posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_posting_id ON applications(posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON applications(stage);
CREATE INDEX IF NOT EXISTS idx_experience_logs_company_id ON experience_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_experience_logs_visibility ON experience_logs(visibility);
CREATE INDEX IF NOT EXISTS idx_experience_logs_author ON experience_logs(author_user_id);
CREATE INDEX IF NOT EXISTS idx_prep_resources_company_id ON prep_resources(company_id);
CREATE INDEX IF NOT EXISTS idx_prep_resources_stage ON prep_resources(stage);

-- GIN Indexes for array/json matching
CREATE INDEX IF NOT EXISTS idx_projects_tags_gin ON projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_tech_stack_gin ON projects USING GIN(tech_stack);
CREATE INDEX IF NOT EXISTS idx_matches_recommended_projects_gin ON matches USING GIN(recommended_project_ids);

