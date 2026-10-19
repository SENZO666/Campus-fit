import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Clock, EyeOff, Flame, Table2, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState, PageHeader, SectionTitle } from "@/components/PageHeader";
import { useProgress } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { EFFORT } from "@/lib/constants";
import { formatDayMonth, formatShort } from "@/lib/dates";

function Stat({ icon: Icon, label, value, hint, testid }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6" data-testid={testid}>
      <p className="flex items-center gap-2 text-sm font-medium text-slate-600"><Icon className="h-4 w-4" aria-hidden="true" />{label}</p>
      <p className="mt-3 font-mono text-4xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-600">{hint}</p>}
    </div>
  );
}

function WeeklyChart({ weekly }) {
  const [view, setView] = useState("chart");
  const data = weekly.map((w) => ({ ...w, label: formatDayMonth(w.week_start) }));
  return (
    <section aria-labelledby="weekly-title" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <SectionTitle id="weekly-title" aside={
        <div role="group" aria-label="Display as" className="inline-flex rounded-full border border-slate-300 p-1">
          {[["chart", "Chart", BarChart3], ["table", "Table", Table2]].map(([v, l, Icon]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} data-testid={`progress-view-${v}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{l}
            </button>
          ))}
        </div>
      }>Planned and completed</SectionTitle>
      <p className="-mt-2 mb-6 text-sm text-slate-600">Sessions per week, last 8 weeks.</p>
      {view === "chart" ? (
        <figure aria-label="Bar chart of planned and completed sessions per week" data-testid="progress-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: 12, borderColor: "#CBD5E1" }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="planned" name="Planned" fill="#CBD5E1" stroke="#64748B" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#0F172A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : (
        <table className="w-full text-left text-sm" data-testid="progress-table">
          <caption className="sr-only">Planned and completed sessions per week</caption>
          <thead><tr className="border-b border-slate-200 text-slate-600"><th scope="col" className="py-2 font-medium">Week starting</th><th scope="col" className="py-2 font-medium">Planned</th><th scope="col" className="py-2 font-medium">Completed</th></tr></thead>
          <tbody>
            {data.map((w) => (
              <tr key={w.week_start} className="border-b border-slate-100">
                <th scope="row" className="py-2.5 font-medium text-slate-900">{w.label}</th>
                <td className="py-2.5 font-mono">{w.planned}</td>
                <td className="py-2.5 font-mono">{w.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RecentList({ sessions }) {
  const qc = useQueryClient();
  const toggle = async (s, shared) => {
    try {
      await api.patch(`/sessions/${s.id}/share`, { shared });
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      toast.success(shared ? "Shared with your peers" : "No longer shared");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  if (!sessions.length) {
    return <EmptyState icon={Trophy} title="No completed sessions yet" testid="progress-empty">Your completed sessions will appear here.</EmptyState>;
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
      {sessions.map((s) => (
        <li key={s.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid={`recent-session-${s.id}`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900">{s.title} <span className="sr-only">(completed)</span></p>
              <p className="font-mono text-sm text-slate-600">
                {formatShort(s.date)} · {s.duration_min} min{s.difficulty ? ` · felt ${EFFORT[s.difficulty - 1].label.toLowerCase()}` : ""}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            Shared with peers
            <span aria-hidden="true" className="w-7 font-semibold">{s.shared ? "On" : "Off"}</span>
            <Switch checked={s.shared} onCheckedChange={(v) => toggle(s, v)} aria-label={`Share ${s.title} on ${formatShort(s.date)} with peers`} data-testid={`share-toggle-${s.id}`} />
          </label>
        </li>
      ))}
    </ul>
  );
}

export default function Progress() {
  const { data, isLoading } = useProgress();
  if (isLoading || !data) return <Skeleton className="h-96 rounded-2xl" />;
  const thisWeek = data.weekly[data.weekly.length - 1];
  return (
    <div>
      <PageHeader eyebrow="Progress" title="Your progress" testid="progress-title"
        description="Sessions you've planned and completed. No weight, no body measurements. Just what you did." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        <Stat icon={CheckCircle2} label="Sessions completed" value={data.total_completed} testid="stat-total-completed" />
        <Stat icon={Trophy} label="This week" value={`${thisWeek.completed}/${thisWeek.planned}`} hint="completed of planned" testid="stat-this-week" />
        <Stat icon={Clock} label="Minutes trained" value={data.minutes_total} testid="stat-minutes" />
        {data.show_streaks ? (
          <Stat icon={Flame} label="Weekly streak" value={data.streak_weeks} hint="weeks in a row with a session" testid="stat-streak" />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6" data-testid="stat-streak-hidden">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-600"><EyeOff className="h-4 w-4" aria-hidden="true" />Streaks hidden</p>
            <p className="mt-3 text-sm text-slate-700">You've turned streaks off. <Link to="/settings" className="font-semibold text-indigo-700 underline underline-offset-4">Change in Settings</Link></p>
          </div>
        )}
      </div>
      <div className="mt-8"><WeeklyChart weekly={data.weekly} /></div>
      <section aria-labelledby="recent-title" className="mt-10">
        <SectionTitle id="recent-title">Recent sessions</SectionTitle>
        <RecentList sessions={data.recent} />
      </section>
    </div>
  );
}
