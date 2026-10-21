# MiniDSP Developer Scorecard

Scores reflect evidence available in the project files and this session as of 2026-10-21. Unverified work receives no objective credit; facilitator review is noted where appropriate.

| Category | Weight | Score | Assessment |
|---|---:|---:|---|
| Functionality | 30 | 24 | Detector, server-validated upload, authentication routes, dashboard, history, findings filters, and masked CSV export are implemented. The migration is not applied, so persisted end-to-end use and owner isolation are not demonstrated; points are withheld for those gaps. Evidence: [Product brief](PRODUCT_BRIEF.md), [upload page](src/app/(app)/upload/page.tsx), [findings page](src/app/(app)/findings/page.tsx), [scan API](src/app/api/scans/route.ts). |
| Testing and reliability | 25 | 22 | Latest reported verification passed: `npm test` (60 tests), `npm run typecheck`, and `npm run build`. Coverage includes detector, upload, API, and CSV behavior. The SQL/RLS test file and real database behavior were not executed; no deployed end-to-end test is evidenced. Evidence: [tests](tests/), [Supabase tests](supabase/tests/scan_rls.test.sql). |
| AI orchestration | 20 | 15 | The work log and learnings document staged implementation, human approvals, observed failures, fixes, security decisions, and actual test outcomes across milestones. The instructor conversation and full prompt/response history are unavailable, so challenge quality and cross-chat orchestration cannot be fully assessed. Evidence: [work log](WORK_LOG.md), [learnings](LEARNINGS.md). |
| Lepide design compliance | 10 | 7 | The app loads the Lepidus CSS/JS, sets `data-theme="light"`, and uses documented `lp-*` components and tokens. Credit is partial because `DESIGN_REFERENCE.md` still leaves the live reference/assets unspecified, and dark/high-contrast and full component self-checks are not evidenced. Evidence: [design contract](design.md), [root layout](src/app/layout.tsx), [Lepidus components](src/components/lepidus-ui.tsx), [design reference](DESIGN_REFERENCE.md). |
| Git and deployment | 10 | 5 | Git evidence: clean worktree on `main`; latest commit `35f7ea0` (`first copy`), timestamp `2026-10-21T14:28:00+05:30`; the provided terminal context reports `git push -u origin main` exited 0. A Vercel deployment and live application smoke test are not evidenced. Repository privacy is also unverified. |
| Learning and demonstration | 5 | 4 | [LEARNINGS.md](LEARNINGS.md) records concrete detector, upload-security, auth, and testing lessons, with a detailed work log of milestones and corrections. A completed final demonstration is not evidenced. |
| **Total** | **100** | **77** | |

## Strengths

- Broad detector and upload/API test coverage, with successful current test, typecheck, and production-build checks.
- Security-aware implementation: server-side size/content validation, masked-only scan results, and an owner-scoped atomic-save design in the migration draft.
- Useful engineering record of failures, fixes, constraints, and lessons learned.

## Improvements

- Apply and verify the database migration in an approved test project; execute the two-user RLS and rollback tests.
- Complete and record a deployed synthetic-data workflow from sign-in through upload, findings, history, and CSV export.
- Populate the approved Lepide reference inputs, compare the UI against them, and capture the instructor/demo evidence for review.

## Unverified Items

- Supabase migration application, two-user isolation, atomic rollback, and persisted scan flow.
- Vercel deployment, live URL, and deployed login-to-export smoke test.
- Lepide design-system compliance; the reference inputs are still TODO.
- Private-repository visibility and any instructor-chat evidence not included in this workspace/session.
- A completed final demonstration.

Facilitator review is recommended for the unverified items above; this scorecard does not treat them as completed work.