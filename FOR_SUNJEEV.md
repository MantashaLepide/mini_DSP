# Sunjeev — Facilitator preparation

## Before the day
1. Give each developer a separate **private** starter GitHub repository and local VS Code workspace with this package at project root. Do not distribute a ZIP on the day.
2. Prepare a working Next.js/React/TypeScript starter and verify Node/npm, VS Code and GitHub Copilot Ask and Agent modes. Ensure two independent chats can be opened.
3. Provision isolated Supabase projects or safely isolated training environments with test auth identities, PostgreSQL and RLS capability. Verify connectivity and safe environment variables. No shared production credentials.
4. Set up GitHub access, Git identity and Vercel deployment access; test a basic deploy. Confirm secrets are excluded from Git.
5. Add **actual** Lepide design-system Markdown files/assets and complete `DESIGN_REFERENCE.md` with valid paths and live URL.
6. Confirm Vitest/RTL/Playwright tools work or document exact scripts. Check internet/network and package installation policy.
7. Provide synthetic data only. Optionally withhold the separate synthetic acceptance-test ZIP until final validation.
8. Use GitHub Copilot Ask mode for the Instructor (Chat 1) and Agent mode for the Developer (Chat 2). The human is the orchestrator, reviewer and decision-maker.

## At the start
- Explain: **Instructor challenges; Developer builds; human decides.**
- Developer opens Chat 1, pastes `START_HERE_INSTRUCTOR.md`; opens Chat 2 and pastes `START_HERE_DEVELOPER.md` once.
- From then on: paste Instructor prompts into Chat 2; paste Chat 2's short handoff back into Chat 1. No manual evidence forms.

## During and after
- Remind developers to review code and approve Git/deploy actions. The Agent maintains `WORK_LOG.md` and `LEARNINGS.md`.
- Give 15/30-minute time warnings; at minute 155 focus on deployment and demo.
- Collect repo URL, live URL, actual test/build results, logs, learnings and 2-minute demo.

## Scoring /100
- The Agent updates `WORK_LOG.md` at the end of every milestone. No scores are produced during the exercise.
- At the end, the Developer asks the Agent to generate `DEVELOPER_SCORECARD.md` (rubric and contents in `START_HERE_DEVELOPER.md`). Review it, and decide every item marked unverified or needing facilitator review.
- Working features 30; testing and real evidence 25; effective AI orchestration/challenge 20; Lepide design 10; Git/deploy 10; learning/demo 5.
- Safety failures (raw-data persistence, exposed secrets, absent owner isolation) require remediation and must not be treated as completed functionality.
