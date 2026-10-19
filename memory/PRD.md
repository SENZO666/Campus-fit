# CampusFit Planner — PRD

## Original problem statement
"Build a prototype of this website. I attached a document about it." (HCIN6222 POE Part One report: CampusFit Planner, a responsive website that helps tertiary students build a realistic weekly workout routine around their academic timetable, then follow and track it.)

## Architecture
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, react-router v7 data router (useBlocker for unsaved changes), @tanstack/react-query, recharts, sonner.
- Backend: FastAPI + Motor (MongoDB). Modules: core.py (models, JWT cookie auth), auth_routes, plan_routes, social_routes, admin_routes, planner.py (rule-based plan builder), exercises_data.py (44 sample exercises), seed.py (admin + 3 demo students, peers, history, challenge).
- Auth: email/password, bcrypt, JWT httpOnly cookies (15 min access + 7 day refresh), brute-force lockout.

## Personas
- Students (any level, gym/residence room/home, with or without equipment)
- Evaluators (lecturer, test participants) using demo accounts
- Admin reviewing reports

## Implemented (19 Oct 2026)
- Landing, register/login/logout, onboarding (6 single-question steps with "why we ask", inline errors, live week preview)
- Weekly plan builder (suggest from profile, replace session, ±5 min within 10–60, swap exercise, add/remove, save with "Plan saved", unsaved-changes warning, this/next week)
- Calendar Mon–Sun with Reschedule dialog, drag-and-drop, undo toasts, delete-week confirmation
- Dashboard: next session + Start, neutral missed-session options, week summary, optional streak
- Guided workout: one exercise at a time, photo, steps, rest timer (pause/±15 s/skip), substitute, skip, end, progress bar, safety note; completion with optional effort rating + share (off by default) + calm celebration
- Progress (totals, planned vs completed chart/table, streak hideable, share toggle)
- Exercise library with search + filters + detail dialog (sample content)
- Peers: exact-username lookup, requests, feed, "Well done", mute/block/report
- Challenges: create, invite peers, join by code, leave, group-only progress, max 8
- Settings: training prefs (with "update my plan"), privacy switches, account, muted/blocked list
- Admin: reports table, filters, resolve/reopen
- Accessibility: skip link, visible focus, labels, icon+text status, aria-live announcer, responsive nav

## Backlog
- P1: password reset by email; gentle optional reminders; copy last week's plan
- P1: surface open sessions from previous weeks on the dashboard
- P2: demo videos with captions; milestone badges; timetable import; usability-testing mode (task timing)
