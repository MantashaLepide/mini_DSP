# MiniDSP — Developer Quick Start

**Mission:** Build a working MiniDSP SaaS prototype in 3 hours using AI to write, test and improve the software.

## Get started — two GitHub Copilot chats

1. Open your assigned MiniDSP project folder in VS Code.
2. Open **GitHub Copilot Chat 1 in Ask mode**. Paste all of `START_HERE_INSTRUCTOR.md`. This is your **Instructor / Challenger**.
3. Open a **separate GitHub Copilot Chat 2 in Agent mode**. Paste all of `START_HERE_DEVELOPER.md`. This is your **Developer**.
4. **Leave Chat 2 waiting.** Do not ask it to build anything yet.
5. Return to Chat 1. Discuss the architecture, ask questions and approve the first small task.
6. Copy Chat 1's task prompt into Chat 2. Chat 2 builds, tests, fixes and reports.
7. Copy Chat 2's report into Chat 1. The Instructor challenges the result; copy its follow-up into Chat 2.
8. Repeat until satisfied, then ask Chat 1 for the next task. You approve important decisions, commits and deployment.

**Keep both chats open in the same VS Code project.** They see shared project files, but **do not share conversation history**. Copy prompts and reports between them.

## Your role

Ask questions whenever you are unsure. Demand actual test commands/results, not just claims. Use **synthetic data only**.

## What completion looks like

By the end of the three-hour challenge, aim to have a **working, cloud-hosted Mini Data Discovery & Classification (MiniDSP) application** — a miniature version of Lepide's data discovery and classification functionality with a modern SaaS interface.

### 1. Dashboard (illustrative)

| Metric | Example |
| --- | ---: |
| Files scanned | 24 |
| Total findings | 147 |
| Critical files | 3 |

| Recent scan | Classification | Findings |
| --- | --- | ---: |
| customer-data.csv | Critical | 42 |
| employees.txt | High | 18 |
| contacts.csv | Medium | 87 |

### 2. File upload and classification (illustrative)

Upload CSV or TXT, **maximum 1 MB**, synthetic data only.

| Finding | Masked example | Risk |
| --- | --- | --- |
| Email | j***@example.com | Low |
| UK phone | 07******321 | Medium |
| National Insurance | AB******C | High |
| Payment card | ************1111 | Critical |

### What the finished application should do

1. Authenticate users with Supabase.
2. Accept CSV and TXT uploads up to 1 MB.
3. Detect emails, UK phones, National Insurance numbers and Luhn-valid payment card candidates.
4. Classify findings Low, Medium, High or Critical (None if no findings).
5. Display and store masked findings, not raw content or unmasked matches.
6. Show dashboard, scan history and filtered findings.
7. Export safe CSV reports.
8. Store scan metadata and masked findings in PostgreSQL with per-user RLS access controls.

### Final demonstration

Open your **Vercel URL**, log in, upload a synthetic file, scan it, view masked classified findings, inspect history and export a CSV. Show your **GitHub repository**, automated test/build results, `WORK_LOG.md` and `LEARNINGS.md`. Explain one defect discovered and fixed through Instructor challenge. After the demo, ask Chat 2 to generate `DEVELOPER_SCORECARD.md`; no scores appear before then.

**Target:** a working prototype in three hours. Clearly disclose anything incomplete or not actually tested.
