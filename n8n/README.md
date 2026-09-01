# Argus — Phase 4: n8n Cron Scheduler & Email Digest Notification Setup

This directory contains the production n8n automation workflow and local Docker orchestration files for Argus.

---

## Architecture Overview (Single Digest Email)

```text
┌─────────────────────┐
│  Schedule Trigger   │
│      Every 2h       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    HTTP Request     │
│ POST /run-ingestion │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     PostgreSQL      │
│   Execute Query     │
│                     │
│ SELECT pending jobs │
└──────────┬──────────┘
           │
           ▼
        ┌──────┐
        │  IF  │
        └──┬───┘
       YES │
           ▼
┌─────────────────────┐
│        Code         │
│ Run once for all    │
│       items         │
│                     │
│ Build email digest  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Send Email      │
│                     │
│   ONE digest mail   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     PostgreSQL      │
│   Execute Query     │
│                     │
│ UPDATE notified_at  │
│    for ALL jobs     │
└─────────────────────┘

IF ──NO──→ nothing
```

---

## Node Configurations

### ① Schedule Trigger
* **Trigger Interval**: `Hours`
* **Hours Between Triggers**: `2`

### ② HTTP Request
* **Method**: `POST`
* **URL**: `http://app:8000/run-ingestion`

### ③ PostgreSQL (SELECT Pending Postings)
* **Operation**: `Execute Query`
* **Query**:
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

### ④ IF Node
* **Condition**: `{{ $input.all().length }} > 0`
* **YES** &rarr; Connect to Code node
* **NO** &rarr; Ends (no email sent)

### ⑤ Code Node (Consolidate into 1 Digest Item)
* **Mode**: `Run Once for All Items`
* **JavaScript Code**:
```javascript
const postings = $input.all().map(item => item.json);

let html = `
<h2>🚀 Argus — New Relevant Job Openings</h2>
<p>Found ${postings.length} new relevant opportunities.</p>
`;

for (const job of postings) {
  html += `
    <div style="
      border:1px solid #ddd;
      border-radius:8px;
      padding:16px;
      margin:12px 0;
    ">
      <h3>${job.title}</h3>

      <p>
        <strong>${job.company_name}</strong>
      </p>

      <p>
        Team: ${job.team || "N/A"}<br>
        Deadline: ${job.deadline || "N/A"}
      </p>

      <a href="${job.url}">
        View Official Job Posting →
      </a>
    </div>
  `;
}

return [
  {
    json: {
      html,
      posting_ids: postings.map(job => job.id),
      count: postings.length
    }
  }
];
```

### ⑥ Send Email (SMTP)
* **To**: `{{ $env.NOTIFICATION_EMAIL_TO }}` (or your personal alert email)
* **Subject**: `Argus: {{ $json.count }} New Relevant Job Openings`
* **Email format**: `HTML`
* **HTML**: `={{ $json.html }}`

### ⑦ PostgreSQL (UPDATE notified_at for ALL jobs)
* **Operation**: `Execute Query`
* **Query**:
```sql
UPDATE postings
SET notified_at = NOW()
WHERE id = ANY(
    ARRAY[{{ $json.posting_ids.join(',') }}]::integer[]
);
```

---

## Quickstart with Docker Compose

```bash
# 1. Start all services
docker compose up -d

# 2. Access n8n web UI
http://localhost:5678

# 3. Import workflow: n8n/argus_workflow.json
```
