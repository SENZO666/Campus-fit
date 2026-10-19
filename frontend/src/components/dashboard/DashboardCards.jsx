import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarClock, CheckCircle2, CircleAlert, CircleDashed, Dumbbell, Flag, Flame, Play, SkipForward, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, sessionState } from "@/components/StatusBadge";
import { useSessionActions } from "@/hooks/useSessionActions";
import { DAY_NAMES, DAY_SHORT, formatShort, relativeDay, weekDates } from "@/lib/dates";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NextSessionCard({ session, exerciseMap, today, onReschedule }) {
  const exercises = session.items.map((i) => exerciseMap[i.exercise_id]).filter(Boolean);
  return (
    <section aria-labelledby="next-session-title" data-testid="next-session-card"
      className="on-dark grain relative overflow-hidden rounded-3xl bg-obsidian p-6 text-white animate-rise sm:p-10">
      <div className="grid gap-8 md:grid-cols-5">
        <div className="md:col-span-3">
          <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Next session</p>
          <h2 id="next-session-title" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{session.title}</h2>
          <p className="mt-3 font-mono text-base text-slate-100" data-testid="next-session-when">
            {relativeDay(session.date, today)} · {session.time} · {session.duration_min} min
          </p>
          <p className="mt-3 text-slate-300">
            {plural(exercises.length, "exercise")}: {exercises.slice(0, 3).map((e) => e.name).join(", ")}
            {exercises.length > 3 && "…"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="xl" variant="accent">
              <Link to={`/workout/${session.id}`} data-testid="dashboard-start-button"><Play aria-hidden="true" />Start</Link>
            </Button>
            <Button size="xl" variant="darkOutline" onClick={onReschedule} data-testid="dashboard-reschedule-button">
              <CalendarClock aria-hidden="true" />Reschedule
            </Button>
          </div>
        </div>
        <ul className="hidden grid-cols-2 gap-2 md:col-span-2 md:grid" aria-hidden="true">
          {exercises.slice(0, 4).map((e, i) => (
            <li key={`${e.id}-${i}`} className="overflow-hidden rounded-xl border border-white/10">
              <img src={e.image} alt="" className="aspect-square h-full w-full object-cover opacity-90" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function NoUpcomingCard({ hasSessions, returning }) {
  const title = returning ? "Welcome back. Let's start small." : hasSessions ? "That's everything for this week" : "Let's plan your week";
  const text = returning
    ? "A short week with one or two sessions is a great way back in."
    : hasSessions
      ? "Nothing else is planned. Rest, or plan next week when you're ready."
      : "Pick the days that suit you and we'll suggest short sessions to match.";
  return (
    <section data-testid="no-upcoming-card" className="on-dark rounded-3xl bg-obsidian p-6 text-white sm:p-10">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Next step</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-lg text-slate-300">{text}</p>
      <Button asChild size="xl" variant="accent" className="mt-8">
        <Link to="/plan" data-testid="dashboard-plan-button">
          {returning ? "Plan a short week" : hasSessions ? "Plan next week" : "Plan your week"}<ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

export function MissedSessions({ sessions, onMove }) {
  const { skip } = useSessionActions();
  return (
    <section aria-labelledby="missed-title" data-testid="missed-sessions-panel" className="rounded-2xl border border-amber-300 bg-amber-50/70 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-1 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
        <div>
          <h2 id="missed-title" className="font-display text-xl font-semibold text-slate-900">Plans change, and that's okay</h2>
          <p className="mt-1 text-slate-700">
            {sessions.length === 1 ? "One session from earlier this week is still open." : `${sessions.length} sessions from earlier this week are still open.`} Choose what suits you.
          </p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {sessions.map((s) => (
          <li key={s.id} data-testid={`missed-session-${s.id}`} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <StatusBadge state="missed" />
              </div>
              <p className="mt-1 font-mono text-sm text-slate-600">{formatShort(s.date)} · {s.time} · {s.duration_min} min</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onMove(s)} data-testid={`missed-move-button-${s.id}`}>
                <CalendarClock aria-hidden="true" />Move this session
              </Button>
              <Button variant="outline" onClick={() => skip(s)} data-testid={`missed-continue-button-${s.id}`}>
                <SkipForward aria-hidden="true" />Continue with the next session
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const DAY_STATE = {
  completed: { icon: CheckCircle2, label: "completed", className: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  missed: { icon: CircleAlert, label: "missed", className: "border-amber-300 bg-amber-100 text-amber-900" },
  skipped: { icon: SkipForward, label: "skipped", className: "border-slate-300 bg-slate-100 text-slate-700" },
  today: { icon: CircleDashed, label: "planned today", className: "border-indigo-400 bg-indigo-50 text-indigo-800" },
  planned: { icon: CircleDashed, label: "planned", className: "border-slate-300 bg-white text-slate-700" },
};

export function WeekSummary({ sessions, weekStart, today }) {
  const done = sessions.filter((s) => s.status === "completed").length;
  const pct = sessions.length ? Math.round((done / sessions.length) * 100) : 0;
  return (
    <section aria-labelledby="week-summary-title" data-testid="week-summary" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      <h2 id="week-summary-title" className="font-display text-xl font-semibold">This week</h2>
      <p className="mt-3">
        <span className="font-mono text-4xl font-bold text-slate-900" data-testid="week-summary-count">{done}</span>
        <span className="text-slate-600"> of {plural(sessions.length, "planned session")} complete</span>
      </p>
      <Progress value={pct} className="mt-4 h-2 bg-slate-200" aria-label={`${done} of ${sessions.length} sessions completed this week`} />
      <ol className="mt-6 grid grid-cols-7 gap-1.5">
        {weekDates(weekStart).map((date, i) => {
          const s = sessions.find((x) => x.date === date && x.status === "completed") || sessions.find((x) => x.date === date);
          const meta = s ? DAY_STATE[sessionState(s, today)] : null;
          const Icon = meta?.icon;
          return (
            <li key={date} className="flex flex-col items-center gap-1.5">
              <span className={cn("font-label text-xs font-semibold uppercase", date === today ? "text-slate-900" : "text-slate-600")} aria-hidden="true">
                {DAY_SHORT[i].slice(0, 2)}
              </span>
              <span aria-hidden="true" className={cn("grid h-9 w-full place-items-center rounded-lg border",
                meta ? meta.className : "border-dashed border-slate-200 text-slate-400", date === today && "ring-2 ring-slate-900 ring-offset-1")}>
                {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs">–</span>}
              </span>
              <span className="sr-only">{DAY_NAMES[i]}: {meta ? `${s.title}, ${meta.label}` : "free day"}</span>
            </li>
          );
        })}
      </ol>
      <Button asChild variant="link" className="mt-5 px-0">
        <Link to="/calendar" data-testid="week-summary-calendar-link">Open calendar<ArrowRight aria-hidden="true" /></Link>
      </Button>
    </section>
  );
}

export function StreakCard({ weeks }) {
  return (
    <section aria-labelledby="streak-title" data-testid="streak-card" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-amber-700" aria-hidden="true" />
        <h2 id="streak-title" className="font-display text-xl font-semibold">Weekly streak</h2>
      </div>
      <p className="mt-3">
        <span className="font-mono text-4xl font-bold" data-testid="streak-weeks">{weeks}</span>
        <span className="text-slate-600"> {weeks === 1 ? "week" : "weeks"} in a row with a session</span>
      </p>
      <p className="mt-2 text-sm text-slate-600">Optional. You can hide streaks in Settings.</p>
    </section>
  );
}

const LINKS = [
  { to: "/library", icon: Dumbbell, label: "Exercise library", text: "Photos and steps for every move" },
  { to: "/peers", icon: Users, label: "Peers", text: "See shared workouts and send a Well done" },
  { to: "/challenges", icon: Flag, label: "Challenges", text: "Small, cooperative group goals" },
];

export function QuickLinks() {
  return (
    <nav aria-label="More" className="grid gap-3">
      {LINKS.map((l) => (
        <Link key={l.to} to={l.to} data-testid={`quick-link-${l.to.slice(1)}`}
          className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-400">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100" aria-hidden="true"><l.icon className="h-5 w-5" /></span>
          <span className="flex-1">
            <span className="block font-semibold text-slate-900">{l.label}</span>
            <span className="block text-sm text-slate-600">{l.text}</span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
