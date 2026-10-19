import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { RescheduleDialog } from "@/components/RescheduleDialog";
import {
  MissedSessions, NextSessionCard, NoUpcomingCard, QuickLinks, StreakCard, WeekSummary,
} from "@/components/dashboard/DashboardCards";
import { useAuth } from "@/context/AuthContext";
import { useExercises, useProgress, useWeek } from "@/hooks/queries";
import { currentWeekStart, daysSince, todayISO, weekLabel } from "@/lib/dates";

const byDateTime = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { map } = useExercises();
  const today = todayISO();
  const weekStart = currentWeekStart();
  const { data: sessions, isLoading } = useWeek(weekStart);
  const { data: progress } = useProgress();
  const [rescheduling, setRescheduling] = useState(null);

  const list = sessions || [];
  const next = list.filter((s) => s.status === "planned" && s.date >= today).sort(byDateTime)[0];
  const missed = list.filter((s) => s.status === "planned" && s.date < today);
  const returning = !list.length && progress?.last_completed_at && daysSince(progress.last_completed_at) > 10;
  const firstName = user.name.split(" ")[0];
  const description = returning
    ? "Good to see you. Here's an easy way back in."
    : missed.length ? "Plans change. Here's your next doable step." : "Here's what's next this week.";

  return (
    <div>
      <PageHeader eyebrow={`Week of ${weekLabel(weekStart)}`} title={`${greeting()}, ${firstName}`}
        description={description} testid="dashboard-title" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {isLoading ? (
            <Skeleton className="h-72 rounded-3xl" />
          ) : next ? (
            <NextSessionCard session={next} exerciseMap={map} today={today} onReschedule={() => setRescheduling(next)} />
          ) : (
            <NoUpcomingCard hasSessions={list.length > 0} returning={returning} />
          )}
          {missed.length > 0 && <MissedSessions sessions={missed} onMove={setRescheduling} />}
        </div>
        <div className="space-y-6 lg:col-span-4">
          <WeekSummary sessions={list} weekStart={weekStart} today={today} />
          {progress?.show_streaks && <StreakCard weeks={progress.streak_weeks} />}
          <QuickLinks />
        </div>
      </div>
      <RescheduleDialog session={rescheduling} open={!!rescheduling} onOpenChange={(o) => !o && setRescheduling(null)} />
    </div>
  );
}
