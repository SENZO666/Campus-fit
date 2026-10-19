import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ClipboardList, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarSessionCard } from "@/components/calendar/CalendarSessionCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import { useAnnounce } from "@/context/Announcer";
import { useWeek } from "@/hooks/queries";
import { useSessionActions } from "@/hooks/useSessionActions";
import { api, errorMessage } from "@/lib/api";
import { DAY_NAMES, DAY_SHORT, addDaysISO, currentWeekStart, formatDayMonth, todayISO, weekDates, weekLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

function DayColumn({ date, index, today, sessions, dragging, dropTarget, setDropTarget, onDrop, children }) {
  const canDrop = !!dragging && date >= today;
  return (
    <section
      aria-labelledby={`day-${date}`}
      data-testid={`calendar-day-${date}`}
      onDragOver={(e) => { if (canDrop) { e.preventDefault(); setDropTarget(date); } }}
      onDragLeave={() => setDropTarget((d) => (d === date ? null : d))}
      onDrop={(e) => { e.preventDefault(); if (canDrop) onDrop(date); }}
      className={cn(
        "flex min-h-[120px] flex-col gap-3 rounded-2xl border p-3 transition-colors lg:min-h-[420px]",
        date === today ? "border-slate-900 bg-white" : "border-slate-200 bg-slate-50/60",
        date < today && "opacity-90",
        dropTarget === date && canDrop && "border-dashed border-indigo-600 bg-indigo-50"
      )}
    >
      <h2 id={`day-${date}`} className="flex items-baseline justify-between px-1">
        <span className="font-label text-sm font-semibold uppercase tracking-wider text-slate-700">
          <span aria-hidden="true">{DAY_SHORT[index]}</span><span className="sr-only">{DAY_NAMES[index]}</span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
          {date === today && <span className="rounded-full bg-slate-900 px-2 py-0.5 font-sans text-[11px] font-semibold text-white">Today</span>}
          {formatDayMonth(date)}
        </span>
      </h2>
      {sessions.length ? children : <p className="px-1 text-sm text-slate-600">Free</p>}
    </section>
  );
}

export default function Calendar() {
  const qc = useQueryClient();
  const { announce } = useAnnounce();
  const { reschedule } = useSessionActions();
  const today = todayISO();
  const [weekStart, setWeekStart] = useState(currentWeekStart());
  const { data: sessions, isLoading } = useWeek(weekStart);
  const [rescheduling, setRescheduling] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const list = sessions || [];

  const handleDrop = async (date) => {
    const s = dragging;
    setDragging(null);
    setDropTarget(null);
    if (!s || s.date === date) return;
    try {
      await reschedule(s, date, s.time);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const clearWeek = async () => {
    try {
      const { data } = await api.delete(`/weeks/${weekStart}`);
      qc.invalidateQueries({ queryKey: ["week"] });
      qc.invalidateQueries({ queryKey: ["progress"] });
      const msg = `Week cleared. ${data.deleted} planned ${data.deleted === 1 ? "session" : "sessions"} removed.`;
      toast.success(msg);
      announce(msg);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const hasOpen = list.some((s) => s.status !== "completed");

  return (
    <div>
      <PageHeader
        eyebrow="Calendar"
        title={weekLabel(weekStart)}
        description="Your week from Monday to Sunday. Use Reschedule on any session, or drag a card to another day on a larger screen."
        testid="calendar-title"
        actions={
          <>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="Previous week" data-testid="calendar-prev-week">
                <ChevronLeft />
              </Button>
              <Button variant="outline" onClick={() => setWeekStart(currentWeekStart())} data-testid="calendar-this-week">This week</Button>
              <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="Next week" data-testid="calendar-next-week">
                <ChevronRight />
              </Button>
            </div>
            <Button asChild variant="default"><Link to="/plan" data-testid="calendar-plan-link"><ClipboardList aria-hidden="true" />Edit plan</Link></Button>
          </>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          {!list.length && (
            <p className="mb-6 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-slate-700" data-testid="calendar-empty">
              Nothing planned this week yet. <Link to="/plan" className="font-semibold text-indigo-700 underline underline-offset-4">Plan this week</Link>
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {weekDates(weekStart).map((date, i) => {
              const day = list.filter((s) => s.date === date);
              return (
                <DayColumn key={date} date={date} index={i} today={today} sessions={day} dragging={dragging}
                  dropTarget={dropTarget} setDropTarget={setDropTarget} onDrop={handleDrop}>
                  {day.map((s) => (
                    <CalendarSessionCard key={s.id} session={s} today={today} onReschedule={setRescheduling}
                      dragging={dragging?.id === s.id} onDragStart={setDragging} onDragEnd={() => { setDragging(null); setDropTarget(null); }} />
                  ))}
                </DayColumn>
              );
            })}
          </div>
          {hasOpen && (
            <div className="mt-10 flex justify-end">
              <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-50" onClick={() => setConfirmClear(true)} data-testid="calendar-clear-week-button">
                <Trash2 aria-hidden="true" />Delete this week's plan
              </Button>
            </div>
          )}
        </>
      )}
      <RescheduleDialog session={rescheduling} open={!!rescheduling} onOpenChange={(o) => !o && setRescheduling(null)} />
      <ConfirmDialog
        open={confirmClear} onOpenChange={setConfirmClear} testid="clear-week-dialog" destructive
        title="Delete this week's plan?" confirmLabel="Delete week"
        description="All planned sessions for this week will be removed. Completed sessions stay in your progress. This can't be undone."
        onConfirm={clearWeek}
      />
    </div>
  );
}
