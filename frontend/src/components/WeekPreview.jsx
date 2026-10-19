import { DAY_NAMES, DAY_SHORT } from "@/lib/dates";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeekPreview({ sessions = [], exerciseMap = {}, loading }) {
  const byDay = new Map(sessions.map((s) => [s.day, s]));
  const summary = sessions.length
    ? `Suggested week: ${plural(sessions.length, "session")}, ${sessions[0].duration_min} minutes each.`
    : "No sessions suggested yet.";

  return (
    <div data-testid="week-preview" aria-busy={loading}>
      <p className="sr-only" aria-live="polite">{summary}</p>
      <ol className="space-y-2">
        {DAY_NAMES.map((name, day) => {
          const s = byDay.get(day);
          const names = s ? s.items.map((i) => exerciseMap[i.exercise_id]?.name).filter(Boolean) : [];
          return (
            <li
              key={day}
              data-testid={`preview-day-${day}`}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition-colors duration-300",
                s ? "border-white/15 bg-white/[0.06]" : "border-dashed border-white/10"
              )}
            >
              <span className="w-10 shrink-0 pt-0.5 font-label text-sm font-semibold uppercase tracking-wider text-slate-300">
                <span aria-hidden="true">{DAY_SHORT[day]}</span>
                <span className="sr-only">{name}</span>
              </span>
              {s ? (
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-display text-base font-semibold text-white">{s.title}</p>
                    <p className="font-mono text-xs text-emerald-300">{s.time} · {s.duration_min} min</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {names.slice(0, 3).join(", ")}
                    {names.length > 3 && ` + ${names.length - 3} more`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Free day</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
