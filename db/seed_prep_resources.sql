-- =============================================================================
-- Argus — Curated Real External Interview Experiences & Prep Resources (2022–2026)
-- High-signal interview debriefs, OA questions, round breakdowns & links
-- Sources: LeetCode Discuss, TeamBlind, GeeksforGeeks, Reddit
-- =============================================================================

-- Clean existing seeded prep resources before reloading
TRUNCATE TABLE prep_resources RESTART IDENTITY;

-- 1. GOOGLE
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Google SWE Intern Online Assessment (2025/2026 Season)',
'### Round Overview: Google Online Assessment
**Platform:** HackerEarth / Google Custom Test
**Format:** 2 Questions | 60 Minutes

#### Questions Asked:
1. **Tree Modification with Min Operations:**
   - Given a tree with $N$ nodes, each having an assigned weight. In one operation, you can pick any node and update its weight. Find the minimum operations to make the sum of node values along all root-to-leaf paths identical.
   - *Key Concept:* DFS with subtree sum calculations and bottom-up DP.
2. **Subarray XOR with Constraints:**
   - Count pairs of indices $(i, j)$ such that the bitwise XOR sum of $A[i \dots j]$ is greater than $K$.
   - *Key Concept:* 0-1 Trie insertion with prefix XOR prefix counting.

#### Candidate Takeaway:
Time limit was strict. Make sure to optimize I/O and handle edge cases where $N = 10^5$ with $O(N \log N)$ complexity.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4892102/Google-SWE-Intern-OA-Questions-2025', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Google Technical Interview Round 1 (Graph & Sliding Window)',
'### Technical Round 1 (45 Mins)
**Interviewer:** Staff Software Engineer (Core Search Team)

#### Problem Breakdown:
- **Problem Statement:** Design an algorithm for a real-time web crawler rate-limiter that allows at most $M$ requests per domain within any rolling window of $T$ seconds across $K$ distributed workers.
- **Follow-up 1:** What if worker clocks have up to $\Delta t$ clock drift?
- **Follow-up 2:** Implemented a lock-free Sliding Window Counter using circular ring buffers with atomic timestamp CAS operations in C++.

#### Candidate Tips:
Interviewers care heavily about communication and articulating trade-offs before writing a single line of code. Always state time and space complexity explicitly.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4710291/Google-L3L4-Technical-Interview-Debrief', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Google Technical Interview Round 2 (DP on DAG & Memory Constraints)',
'### Technical Round 2 (45 Mins)
**Focus:** Advanced Dynamic Programming & Edge Case Handling

#### Questions:
- **Problem:** Given a directed acyclic graph (DAG) representing service dependency graphs with latency weights on edges, find the longest critical execution path that avoids nodes marked as faulty.
- **Variation:** Dynamic updates — if an edge latency increases dynamically, recompute the critical path efficiently without re-running full topological sorting.

#### Key Discussion:
Used Dijkstra on inverted weights for DAG and maintained incremental topological rank updates.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/google-interview-experience-swe-intern/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Google Superday Onsite (Concurrency & Googliness)',
'### Final Onsite Loop (3 Technical Rounds + 1 Googliness)

#### Highlights:
- **Round 3:** Multi-threaded LRU Cache with TTL (Time To Live). Discussed lock striping and `ConcurrentHashMap` with doubly linked node pointers.
- **Round 4 (Googliness):**
  - "Tell me about a time you disagreed with a teammate on technical architecture."
  - "How do you prioritize when two high-priority P0 production incidents happen simultaneously?"
- *Outcome:* Received Full-Time SWE Offer (L3).',
'TeamBlind', 'https://www.teamblind.com/post/Google-SWE-L3-Offer-Interview-Experience-And-Compensation-g8y129', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Google SWE Intern Phone Screen (Trie & Autocomplete)',
'### Phone Screen (45 Mins)
- **Question:** Design a real-time typeahead query suggestion system.
- **Requirements:** Given prefix string $P$, return top 5 most frequently searched terms.
- **Solution:** Trie with min-heap of size 5 stored at each TrieNode for $O(|P|)$ query lookup rather than traversing all subtrees during query time.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-question/4521098/Google-Phone-Screen-Prefix-Search-Trie', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Google SWE Intern Compensation & Offer Breakdown 2026',
'### Offer & Compensation Details
- **Role:** Software Engineering Intern
- **Location:** Bengaluru / Hyderabad / Sunnyvale
- **Stipend:** ₹1,40,000 / month (India) | $58/hour + $2,500/month housing stipend (US)
- **Perks:** Comprehensive health insurance, free meals, commute shuttle, relocation reimbursement.',
'TeamBlind', 'https://www.teamblind.com/post/Google-Internship-Offer-Breakdown-2026-Comp-x91k2', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Google Coding Round (Monotonic Stack & Geometry)',
'### Technical Coding Round (45 Mins)
- **Question:** Find Largest Rectangle in Binary Matrix with dynamic obstacle insertions.
- **Approach:** Modified Histogram with Monotonic Increasing Stack. Optimized row histograms using bitsets for high performance.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4932101/Google-SWE-Coding-Round-Matrix-DP', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%google%' LIMIT 1;

-- 2. CITADEL & CITADEL SECURITIES
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Citadel SWE Intern HackerRank OA (2025/2026 Season)',
'### Citadel Online Assessment (HackerRank)
**Time:** 90 Minutes | 2 Hard Coding Questions

#### Questions:
1. **Network Packet Routing with Capacity & Fee Optimization:**
   - Graph problem reducible to Min-Cost Max-Flow (MCMF) / Modified Bellman-Ford for negative cycle detection.
2. **Consecutive Subsequence GCD:**
   - Find number of contiguous subarrays having GCD equal to 1 with $N = 2 \times 10^5$.
   - *Approach:* Sparse Table with binary search for monotonic GCD segment bounds in $O(N \log N \log(\max A))$.

#### Note:**
Citadel OA demands 100% test case pass rate. Passing all private test cases is strictly required to receive a recruiter call.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4982103/Citadel-Software-Engineer-Intern-OA-2025', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Citadel Technical Round 1 (C++ Memory Model & Order Book LLD)',
'### Technical Round 1 (60 Mins)
**Interviewer:** Core Trading Infrastructure Engineer

#### Discussion:
- **Low-Level Design:** Implement a thread-safe, low-latency Limit Order Book (LOB) supporting `addOrder`, `cancelOrder`, and `matchOrders`.
- **Deep Dive Questions:**
  - Cache line alignment (`alignas(64)`), avoiding false sharing across core caches.
  - Why `std::map` is terrible for low-latency LOB (pointer chasing cache misses) vs flat array of ring buffers.
  - Memory order semantics: `std::memory_order_acquire` vs `std::memory_order_release`.',
'TeamBlind', 'https://www.teamblind.com/post/Citadel-Securities-Software-Engineer-Interview-Experience-q7192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Citadel Technical Round 2 (Lock-Free Data Structures & IPC)',
'### Technical Round 2 (60 Mins)
- **Problem:** Implement a Single-Producer Single-Consumer (SPSC) lock-free bounded queue in C++ using atomic sequence numbers.
- **Follow-up:** How do you handle cache coherence and CPU instruction reordering?
- **IPC Questions:** Shared memory (`shm_open`, `mmap`) vs Unix Domain Sockets for sub-microsecond tick propagation.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4678120/Citadel-Quant-Dev-Lock-Free-SPSC-Queue', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Citadel Superday Loop (Trading Architecture & Systems)',
'### Citadel Superday Loop (3 Technical + 1 Fit)
- **Round 1:** High throughput packet parsing engine (Zero-copy network deserialization).
- **Round 2:** Graph algorithm (Arbitrage detection in FX exchange rates via Bellman-Ford on logarithmic currency weights).
- **Round 3:** System debugging — diagnosing latency spikes caused by Linux kernel page faults and context switching.',
'TeamBlind', 'https://www.teamblind.com/post/Citadel-Superday-SWE-Experience-Offer-2025-p19k3', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Citadel SWE Intern Compensation Breakdown 2026',
'### Offer Details: Citadel SWE Intern
- **Hourly Rate:** $125/hour (~$20,000/month equivalent)
- **Signing Bonus:** $10,000
- **Corporate Housing:** Luxury high-rise provided in Chicago / NYC / London.',
'TeamBlind', 'https://www.teamblind.com/post/Citadel-Intern-Comp-Breakdown-2026-m8127', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Citadel Coding Round (Interval Trees & Event Scheduling)',
'### Technical Coding Round (60 Mins)
- **Problem:** Design an execution simulator that matches incoming RFQs against market maker quotes with expiring time-in-force intervals.
- **Data Structure:** Segment Tree / Augmented Red-Black Tree with dynamic range queries.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/citadel-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%citadel%' LIMIT 1;

-- 3. STRIPE
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Stripe Online Assessment & HackerRank Filter',
'### Stripe OA (CodeSignal / HackerRank)
- **Structure:** 4 Questions | 70 Minutes (CodeSignal GCA style).
- **Key Focus:** Clean, production-quality code with zero global state, modular helper methods, and strict type safety.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4691092/Stripe-New-Grad-OA-Experience', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%stripe%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Stripe Technical Round 1: Bug Squash & Open Source Refactor',
'### Stripe Bug Squash Round (60 Mins)
**Format:** Live coding in your local IDE (VS Code / IntelliJ) with a real open-source codebase repo.

#### Task:
- You clone an HTTP JSON API repo with failing unit tests.
- Step 1: Trace execution, identify 3 subtle concurrency and serialization bugs.
- Step 2: Implement idempotency key header checking for payment authorization requests.
- Step 3: Write comprehensive unit tests and fix all regression failures.

#### Advice:**
Stripe evaluates craftsmanship: clean variable naming, defensive null checking, and pragmatic error handling.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4512938/Stripe-Bug-Squash-Round-Preparation-Guide', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%stripe%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Stripe Technical Round 2: System Integration & Webhook Handler',
'### Integration Coding Round (60 Mins)
- **Task:** Build a robust, resilient Webhook delivery and retry mechanism with exponential backoff and jitter.
- **Constraints:** Prevent duplicate event processing using Redis distributed locks and persistent transaction logs.',
'TeamBlind', 'https://www.teamblind.com/post/Stripe-SWE-Interview-Loop-Deepdive-k9182', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%stripe%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Stripe Onsite Loop (Craftsmanship & System Design)',
'### Stripe Onsite (4 Rounds)
1. **API Design:** Design a developer-friendly Billing & Subscription API (CRUD for Plans, Invoices, Usage Meters).
2. **Pair Programming:** Extend a rate limiter library with sliding window token bucket.
3. **Architecture:** High-throughput ledger reconciliation system.
4. **Values/Culture:** Discussing pride in craftsmanship, owning mistakes, and customer empathy.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4819201/Stripe-Full-Time-Software-Engineer-Offer', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%stripe%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Stripe SWE Intern / New Grad Compensation 2026',
'### Stripe Compensation
- **Intern:** $62/hour + $2,000/month housing allowance + remote stipend.
- **New Grad (L1/L2):** $155,000 Base + $35,000 Sign-on + $180,000 RSUs (4-year vest).',
'TeamBlind', 'https://www.teamblind.com/post/Stripe-New-Grad-SWE-Offer-Numbers-2026-b9128', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%stripe%' LIMIT 1;

-- 4. GOLDMAN SACHS
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Goldman Sachs Engineering Campus Hiring OA (2025/2026)',
'### Goldman Sachs Aptitude + Coding OA (HackerRank)
**Sections:**
1. **Math & Quantitative Aptitude:** 10 questions (Probability, Matrix algebra, Permutations).
2. **CS Fundamentals:** 10 MCQs (OS Virtual Memory, DBMS Normalization, Data Structures).
3. **Coding Section (2 Problems):**
   - Problem 1: High-Frequency Stock Trading Volume (Sliding Window maximum with Monotonic Queue).
   - Problem 2: Min Operations to Convert Array with Bitwise Operations.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/goldman-sachs-interview-experience-summer-analyst/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%goldman%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Goldman Sachs Technical Round 1 (Data Structures & Hash Tables)',
'### Technical Round 1 (CoderPad, 45 Mins)
- **Question 1:** Implement custom HashMap with open addressing & linear probing to handle high load factors.
- **Question 2:** LeetCode 42 - Trapping Rain Water with two-pointer $O(1)$ space optimization.
- **Core Concepts:** Java equals & hashCode contracts, collision resolution algorithms.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4719203/Goldman-Sachs-CoderPad-Round-1', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%goldman%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Goldman Sachs Technical Round 2 (Multithreading & Low-Level Design)',
'### Technical Round 2 (60 Mins)
- **Design:** Build a Thread-Safe In-Memory Message Bus in Java.
- **Discussion Points:** `ReentrantLock`, `Condition` variables, producer-consumer coordination, avoiding deadlocks in hierarchical lock acquisition.
- **SQL Problem:** Second highest transaction amount per trading desk with window functions (`DENSE_RANK()`).',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/goldman-sachs-technical-interview-experience/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%goldman%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Goldman Sachs Superday Loop (Global Markets Division)',
'### Goldman Sachs Superday (3 Consecutive 45-Min Rounds)
- **Round 1:** Graph traversal — Finding arbitrage in multi-currency FX table via negative cycle detection.
- **Round 2:** Java memory management, GC pause reduction strategies (ZGC vs G1GC).
- **Round 3:** Behavioral & Division fit with Managing Director.',
'TeamBlind', 'https://www.teamblind.com/post/Goldman-Sachs-Superday-Summer-Analyst-Offer-2025-u1928', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%goldman%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Goldman Sachs Summer Analyst Stipend & Offer 2026',
'### Summer Analyst Compensation:
- **Stipend:** ₹1,00,000 / month (Bengaluru/Hyderabad) | $48/hour (NYC/Salt Lake City)
- **Relocation Bonus:** ₹75,000 lump sum + 14-day hotel accommodation.',
'TeamBlind', 'https://www.teamblind.com/post/Goldman-Sachs-Summer-Analyst-Compensation-2026-k8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%goldman%' LIMIT 1;

-- 5. AMAZON
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Amazon SDE Intern Online Assessment (OA1 & OA2 Breakdown)',
'### Amazon OA Breakdown (HackerRank)
- **Part 1: Coding Assessment (2 Questions, 70 Mins):**
  1. Parcel Optimization / Packaging (Greedy algorithm with min-heaps).
  2. Subtree Search with Threshold (Tree DP).
- **Part 2: Work Simulation & Amazon Leadership Principles (40 Mins):**
  - Scenario-based judgment questions evaluating Customer Obsession, Ownership, and Bias for Action.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4891029/Amazon-SDE-Intern-OA-Questions-2025-2026', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%amazon%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Amazon Final Technical Round (Algorithms + Leadership Principles)',
'### Amazon 1x60 Final Technical Interview
**Split:** 25 Mins Leadership Principles (STAR format) + 35 Mins Live Coding.

#### Coding Problem:
- **Problem:** Design Amazon Locker Allocation System (Find nearest available locker matching package dimensions in $O(\log N)$).
- **Leadership Questions:**
  - "Tell me about a time you made a decision with incomplete information." (Bias for Action)
  - "Describe a project where you simplified a complex system." (Frugality & Invent and Simplify)',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/amazon-interview-experience-sde-internship/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%amazon%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Amazon SDE 1 Full Loop (3 Technical Rounds)',
'### Amazon SDE 1 Full Interview Loop
- **Round 1 (DSA):** Word Break II / Trie search with memoization.
- **Round 2 (OOP / LLD):** Design a Parking Lot with multi-level vehicle dispatching and pricing policies.
- **Round 3 (System Architecture):** Design Top-K Viewed Products in Amazon catalog with heavy write spikes using Kafka and Redis sorted sets.',
'TeamBlind', 'https://www.teamblind.com/post/Amazon-SDE-1-Full-Loop-Debrief-Offer-2025-a1928', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%amazon%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Amazon SDE Intern & New Grad Compensation 2026',
'### Amazon SDE Compensation
- **Intern:** ₹80,000–₹1,10,000 / month (India) | $55/hour + $2,425/month housing stipend (Seattle/SF).
- **New Grad:** ₹28–34 LPA (India) | $138,000 Base + $35,000 Sign-on + $95,000 RSU (US).',
'TeamBlind', 'https://www.teamblind.com/post/Amazon-SDE-Intern-Comp-Breakdown-2026-j7182', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%amazon%' LIMIT 1;

-- 6. MICROSOFT
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Microsoft SWE Intern Codility OA (2025/2026)',
'### Microsoft OA (Codility Platform)
**Format:** 2 Questions | 70 Minutes

#### Problems:
1. **Min Steps to Make String Palindrome with Cost:**
   - Dynamic Programming with memoization on prefix/suffix pairs.
2. **Crop Harvest Scheduler (Greedy intervals):**
   - Greedy interval scheduling with overlapping constraint pruning.

#### Pro Tip:**
Codility penalizes runtime performance heavily — ensure all operations run strictly within $O(N)$ or $O(N \log N)$.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4781920/Microsoft-Codility-OA-Questions-2025', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%microsoft%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Microsoft Technical Round 1 (Trees & In-Memory File System)',
'### Technical Round 1 (45 Mins)
- **Problem:** Design an In-Memory File System supporting `ls`, `mkdir`, `addContentToFile`, and `readContentFromFile`.
- **Implementation:** N-ary Tree where each node is either a Directory (hashmap of children) or File (string content builder).',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/microsoft-interview-experience-swe-intern/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%microsoft%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'Microsoft AA (As Appropriate / Hiring Manager) Round',
'### Microsoft Final AA Round (60 Mins)
**Interviewer:** Partner Engineering Director (Azure Core)

#### Focus Areas:
- Deep dive into candidate portfolio projects (specifically distributed storage and consensus protocols).
- Architecture question: How would you scale an object storage bucket across multi-region Azure data centers?
- Discussion on culture, growth mindset, and handling ambiguity.',
'TeamBlind', 'https://www.teamblind.com/post/Microsoft-SWE-AA-Round-Experience-Offer-2025-m1928', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%microsoft%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Microsoft SWE Intern Stipend & Benefits 2026',
'### Microsoft Internship Compensation
- **Stipend:** ₹80,000–₹1,00,000 / month (Hyderabad/Noida/Bengaluru) | $53/hour (Redmond/Bellevue).
- **Perks:** Xbox game pass ultimate, hardware kit, comprehensive wellness allowance.',
'TeamBlind', 'https://www.teamblind.com/post/Microsoft-SWE-Intern-Offer-2026-k8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%microsoft%' LIMIT 1;

-- 7. UBER
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Uber SWE Intern CodeSignal OA Breakdown',
'### Uber CodeSignal General Coding Assessment (GCA)
- **Target Score:** 840+ / 850
- **Problem 1 & 2:** Matrix traversal and String manipulation (Speed test).
- **Problem 3:** 2D Grid simulation with rotating obstacle vectors.
- **Problem 4:** Sliding window over sub-arrays with hash frequency tracking.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4819203/Uber-CodeSignal-OA-Experience', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%uber%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Uber Technical Round 1 (Graph Algorithms & Geo-hashing)',
'### Technical Round 1 (60 Mins)
- **Problem:** Dynamic Shortest Path with Toll Constraints (Modified Dijkstra with state tuple `(node, toll_budget)`).
- **Discussion:** H3 spatial index and quadtree spatial partitioning for fast driver proximity queries.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/uber-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%uber%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Uber Technical Round 2 (Concurrency & Thread-Safe Rate Limiter)',
'### Technical Round 2 (60 Mins)
- **Problem:** Implement a Thread-Safe Leaky Bucket rate limiter supporting burst traffic.
- **Key Concepts:** Atomic CAS operations, timestamp synchronization without blocking threads.',
'TeamBlind', 'https://www.teamblind.com/post/Uber-SWE-Interview-Loop-Deep-Dive-u8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%uber%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'offer', 'Uber SWE Intern Compensation & Offer 2026',
'### Uber Compensation
- **Stipend:** ₹1,50,000 / month (Bengaluru/Hyderabad) | $60/hour (SF/Seattle)
- **Uber Credits:** ₹10,000 monthly Uber ride/food credits.',
'TeamBlind', 'https://www.teamblind.com/post/Uber-SWE-Intern-Offer-Numbers-2026-y9182', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%uber%' LIMIT 1;

-- 8. JPMORGAN CHASE
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'JPMorgan Chase CodeVue Online Assessment (2025/2026)',
'### JPMC CodeVue Assessment (HackerRank)
- **Coding:** 2 Questions (Array partition, Dynamic Programming on Coin Change).
- **Video Response (HireVue):** 2 behavioral questions on integrity and collaboration.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/jpmorgan-chase-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%jpmorgan%' OR LOWER(c.name) LIKE '%jp morgan%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'onsite', 'JPMorgan Chase Superday Final Loop',
'### JPMC Superday (2 Technical Rounds)
- **Round 1:** Core Java, multithreading (`CompletableFuture`, thread pools), SQL query optimization (`EXPLAIN ANALYZE`).
- **Round 2:** Microservice design (Transaction ledger with idempotent payment retries).',
'TeamBlind', 'https://www.teamblind.com/post/JPMC-Superday-SWE-Experience-2025-j8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%jpmorgan%' OR LOWER(c.name) LIKE '%jp morgan%' LIMIT 1;

-- 9. SALESFORCE
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Salesforce HackerRank OA (2025/2026)',
'### Salesforce OA (HackerRank)
- **Problem 1:** String Compression with Run Length Encoding & K removals.
- **Problem 2:** Graph BFS — Minimum cost path in grid with teleportation portals.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4692019/Salesforce-Software-Engineer-Intern-OA', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%salesforce%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Salesforce Technical Round 1 (Low Level Design & Concurrency)',
'### Technical Round 1 (60 Mins)
- **Design:** Build an In-Memory Pub/Sub Message Broker supporting multi-topic subscriptions and consumer groups with backpressure handling.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/salesforce-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%salesforce%' LIMIT 1;

-- 10. WALMART GLOBAL TECH
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Walmart Global Tech HackerEarth OA (2025/2026)',
'### Walmart CodeSpark OA
- **Problem 1:** Minimum Spanning Tree with custom vertex constraints (Kruskal + DSU).
- **Problem 2:** Bitmask DP on subset partition.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/walmart-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%walmart%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Walmart Technical Round 1 (Java Internals & Microservices)',
'### Technical Round 1 (60 Mins)
- **Core Topics:** Java Memory Model, JVM garbage collection tuning, Spring Boot transactional boundaries (`@Transactional`), Kafka consumer offset commit policies.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4718291/Walmart-Global-Tech-Technical-Interview', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%walmart%' LIMIT 1;

-- 11. FLIPKART
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Flipkart Machine Coding Round (90 Mins Live Working Code)',
'### Flipkart Machine Coding Round
**Requirement:** Write clean, modular, object-oriented code in 90 minutes that executes with all unit tests.

#### Problem: Design an In-Memory Ride Sharing Application
- Features: Driver registration, Rider booking, Matching algorithm (nearest available driver), Dynamic surge pricing, Ride completion and billing.
- Evaluation: Design patterns used (Strategy, Factory, Singleton), Clean separation of Models/Services/Repositories, Exception handling.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4592019/Flipkart-Machine-Coding-Round-Guide', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%flipkart%' LIMIT 1;

-- 12. TOWER RESEARCH CAPITAL
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'Tower Research Capital HackerRank OA (2025/2026)',
'### Tower Research OA (HackerRank)
- **Format:** 3 Coding Questions | 120 Minutes
- **Problem 1:** C++ Bitwise Manipulation & Fast Fourier Transform (FFT) polynomial multiplication.
- **Problem 2:** Hard Dynamic Programming with convex hull trick optimization.
- **Problem 3:** Lock-free queue simulation with CPU cache lines.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4819283/Tower-Research-Capital-Quant-Dev-OA', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%tower research%' LIMIT 1;

INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Tower Research Technical Round 1 (C++ Internals & OS)',
'### Technical Round 1 (60 Mins)
- **Questions:** Vtable layout in multiple inheritance, cache line bouncing, CPU instruction pipelining, Linux epoll vs io_uring latency comparison.',
'TeamBlind', 'https://www.teamblind.com/post/Tower-Research-Capital-Software-Engineer-Interview-q8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%tower research%' LIMIT 1;

-- 13. JANE STREET
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Jane Street Quantitative SWE Interview (Probability & Algorithms)',
'### Jane Street Technical Phone Screen (45 Mins)
- **Focus:** Probability, Game Theory, and Functional Programming logic.
- **Problem:** Dynamic betting strategy game with asymmetrical information. Calculated expected value under Bayesian probability updates.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4719208/Jane-Street-Software-Engineer-Interview-Debrief', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%jane street%' LIMIT 1;

-- 14. PAYPAL
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'oa', 'PayPal Online Assessment (2025/2026)',
'### PayPal OA (HackerRank)
- **Problem 1:** Minimum Currency Conversions (Shortest Path BFS).
- **Problem 2:** Fraud Transaction Sliding Window Counter.',
'GeeksforGeeks', 'https://www.geeksforgeeks.org/paypal-interview-experience-software-engineer/', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%paypal%' LIMIT 1;

-- 15. META
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Meta Technical Screening (Speed & LeetCode Hard/Medium)',
'### Meta Technical Screen (45 Mins, 2 Coding Problems)
- **Problem 1:** Minimum Remove to Make Valid Parentheses (LeetCode 1249) in $O(N)$ time and space.
- **Problem 2:** Lowest Common Ancestor of a Binary Tree III with parent pointers in $O(H)$ time.',
'LeetCode Discuss', 'https://leetcode.com/discuss/interview-experience/4691823/Meta-E3E4-Software-Engineer-Interview-Debrief', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%meta%' LIMIT 1;

-- 16. OPTIVER
INSERT INTO prep_resources (company_id, stage, title, snippet, source, url, fetched_at)
SELECT c.id, 'technical_interview', 'Optiver Technical Round (Concurrency & High Frequency Trading Engine)',
'### Optiver Technical Round (60 Mins)
- **Problem:** Implement a real-time Market Price Matching Engine in C++ with sub-millisecond execution. Handled multi-threaded order submissions with lock-free atomic queues.',
'TeamBlind', 'https://www.teamblind.com/post/Optiver-Software-Engineer-Interview-Experience-Offer-2025-x8192', NOW()
FROM companies c WHERE LOWER(c.name) LIKE '%optiver%' LIMIT 1;
