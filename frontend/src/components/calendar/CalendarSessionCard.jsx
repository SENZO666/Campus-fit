import { Link } from "react-router-dom";
import { CalendarClock, GripVertical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, sessionState } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

export function CalendarSessionCard({ session, today, onReschedule, onDragStart, onDragEnd, dragging }) {
  const state = sessionState(session, today);
  const movable = session.status !== "completed";
  const startable = session.status === "planned";
  return (
    <article
      draggable={movable}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", session.id); e.dataTransfer.effectAllowed = "move"; onDragStart(session); }}
      onDragEnd={onDragEnd}
      data-testid={`calendar-session-${session.id}`}
      aria-label={`${session.title}, ${session.time}, ${session.duration_min} minutes`}
      className={cn(
        "group rounded-xl border bg-white p-3.5 shadow-sm transition-[box-shadow,opacity,transform] duration-200",
        movable && "lg:cursor-grab hover:shadow-md",
        state === "completed" ? "border-emerald-200" : state === "missed" ? "border-amber-300" : "border-slate-200",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-sm font-bold text-slate-900">{session.time}</p>
        {movable && <GripVertical className="hidden h-4 w-4 text-slate-400 lg:block" aria-hidden="true" />}
      </div>
      <h3 className="mt-1 font-display text-base font-semibold leading-tight text-slate-900">{session.title}</h3>
      <p className="mt-0.5 text-xs text-slate-600">{session.duration_min} min · {session.items.length} exercises</p>
      <StatusBadge state={state} className="mt-2.5" testid={`calendar-status-${session.id}`} />
      {movable && (
        <div className="mt-3 grid gap-1.5">
          {startable && (
            <Button asChild size="sm" className="h-8 w-full px-3 text-xs">
              <Link to={`/workout/${session.id}`} data-testid={`calendar-start-${session.id}`}>
                <Play aria-hidden="true" />Start<span className="sr-only"> {session.title}</span>
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 w-full px-2 text-xs" onClick={() => onReschedule(session)} data-testid={`calendar-reschedule-${session.id}`}>
            <CalendarClock aria-hidden="true" />Reschedule<span className="sr-only"> {session.title}</span>
          </Button>
        </div>
      )}
    </article>
  );
}
