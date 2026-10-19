# CampusFit Planner: Prototype Plan

A responsive website that helps tertiary students build a realistic weekly workout routine around their academic timetable, then follow and track it.
It covers planning, scheduling, guided workouts and progress, plus optional peer accountability. It does not do nutrition, medical advice or body tracking.

## Who it's for
- **Students** at any fitness level, with little or a lot of free time, training in a gym, a residence room or at home, with or without equipment. They plan on a laptop and mostly work out with their phone.
- **Evaluators (lecturer, test participants)** who need to sign in and try the full journey straight away, including the peer features.
- **One admin account** that reviews reports students make about other accounts.

## Core features and experience
**Accounts and profile**
- Sign up and log in with email and password. Each student picks a display name and a username so peers can find them.
- Profile keeps goal, experience level, available days, session length, equipment and training place. Everything can be edited later, and the plan follows the changes.

**Onboarding (one question at a time)**
- Short guided questions such as "How many days can you realistically train this week?", with a one-line note on why each one is asked.
- A live preview shows how each answer changes the suggested week.
- Plain, specific errors shown next to the field, for example "Choose at least one available day".

**Weekly plan builder (simple rules)**
- Suggests a week of short sessions based on the student's days, time per session, equipment and level.
- The student can accept the plan, replace a session, make a session shorter or longer within set limits, or swap an exercise for another one.
- If "no equipment" is chosen, exercises that need equipment are never suggested.
- A clear "Plan saved" confirmation appears and the calendar updates right away. Leaving with unsaved edits triggers a warning.

**Weekly calendar and rescheduling**
- A simple Monday–Sunday view with session cards at the times the student chose around lectures.
- Every card has a "Reschedule" button. Drag-and-drop also works on larger screens.
- Deleting a whole week asks for confirmation. Small changes that can be undone don't.

**Dashboard**
- Shows the current week, the next session and one main action: "Start".
- A missed session gets neutral options ("Move this session", "Continue with the next session"). There is no guilt or "failure" wording.

**Guided workout**
- Shows one exercise at a time: name, reps or duration, rest time, a photo and short written steps.
- Rest timer with pause and adjust. Controls to pause, skip, substitute and end.
- A progress bar shows how much of the workout is left. A reminder to stop if pain or unusual symptoms occur, and a note that the site does not replace medical advice.

**Completion and progress**
- Mark the session as complete, optionally rate how hard it felt, then see a short, calm celebration.
- The progress page shows completed sessions, planned vs completed, and weekly streaks. No weight or body measurements.
- Streaks are secondary and can be hidden in settings.

**Exercise library**
- Browse and filter exercises by muscle group, equipment and difficulty. Each one has a photo and concise steps.
- Students can also pick substitutions from here.

**Peers and challenges (real, between student accounts)**
- Find classmates by username and send a peer request. Nothing is shared until the other student accepts.
- Optionally share a completed workout with accepted peers. Sharing is off by default.
- Send a "Well done" reaction on a peer's shared workout.
- Create or join small consistency challenges (for example "Complete 3 planned sessions this week"). Wording is cooperative ("Support your group"), progress is shown per group, and there are no public leaderboards.
- Mute, block or report any account. Reports go to the admin.

**Privacy settings**
- Plain-language controls for what gets shared and with whom. Schedule, goal and progress stay private by default.

**Admin**
- A simple list of reports (who, about whom, reason, date) that can be marked resolved.

**Accessibility (aiming for WCAG 2.0 AA)**
- Every core action works with a keyboard. Visible focus, a "Skip to main content" link and no keyboard traps.
- Contrast of at least 4.5:1 for normal text. Status is never shown by colour alone: completed and missed sessions also get labels or icons.
- Labels stay visible on all form fields, icons sit next to text, photos have meaningful alt text and status messages like "Plan saved" are announced to screen readers.
- Works on phone and laptop with the same navigation and terms everywhere ("Plan", "Start", "Reschedule", "Complete").

## User flow
1. A student lands on a short welcome page and signs up (or logs in).
2. Onboarding asks one question at a time. The suggested week updates live.
3. The student reviews the suggested week, adjusts sessions or swaps exercises, and saves. The calendar fills in.
4. On the dashboard they see the next session and press "Start".
5. The guided workout runs exercise by exercise with a progress bar and rest timer. They can substitute or skip any exercise.
6. They mark it complete, optionally rate the difficulty, and the progress page updates.
7. If plans change, they press "Reschedule" on a card (or drag it) and the new day appears straight away.
8. Optionally they add peers, share a finished workout, send "Well done" and join a small challenge.
9. Returning after a break, the dashboard shows the next achievable step without any shaming message.

## UI/UX feel
Restrained, modern fitness look: strong contrast, clear type, plenty of white space and consistent components, so it feels energetic without clutter. The tone is encouraging and calm, never judgmental. Feedback is immediate, buttons say what they do, and the next action is always the most visible thing on the screen. Exercise photos are clear and consistent in style.

## Implementation phases
**Phase 1 — MVP (built now)**
Everything under Core features: accounts, onboarding, rule-based weekly plan builder, calendar with Reschedule and drag-and-drop, dashboard, guided workout with timer, completion and progress, exercise library with photos and written steps, real peers and challenges with mute/block/report, privacy settings, admin report review, accessibility and responsive layout. Demo accounts so evaluators can try everything immediately.

**Phase 2 — Polish and reach**
Password reset by email, optional gentle workout reminders (no guilt wording, easy to turn off), short demo videos with captions next to the photos, optional badges for milestones such as returning after a break, and the ability to copy last week's plan into the new week.

**Phase 3 — Fit around real timetables and evaluation**
Import a lecture timetable so free slots are suggested automatically, group challenges with more templates, and a simple usability-testing mode for Part 2 that times key tasks (for example "create and schedule a weekly plan") and records whether they were completed without help.

## Assumptions
- The site is called **CampusFit Planner** and is in English.
- The week runs Monday to Sunday. Times follow the student's device time zone.
- Session length can be set from 10 to 60 minutes in 5-minute steps. Negative or empty values and past dates can't be chosen.
- Students pick a specific start time for each available day. That's how sessions fit around lectures.
- The suggested plan comes from fixed rules (goal + level + equipment + time). No AI is used.
- The exercise library starts with about 30 exercises, each with a stock photo and written steps. All of it is clearly labelled sample content that can be edited later.
- Peers find each other by username only. There is no public directory of students.
- Shared workouts and challenge progress are visible only to accepted peers or challenge members. Nothing is public.
- Challenges are consistency-based only (number of sessions completed), with up to 8 members each.
- A blocked account can't send requests, reactions or challenge invites. A muted account's activity is hidden without the other person knowing.
- No emails or notifications are sent in Phase 1. Forgotten passwords are handled in Phase 2.
- A seeded admin account and two sample student accounts (already peers of each other) are created so evaluators can test the social features right away. Their logins will be shared once the build is done.
- The visual style is left to the design step, within the restrained, high-contrast brief in the report.
