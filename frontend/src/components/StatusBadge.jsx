import { CheckCircle2, CircleDashed, Clock, CircleAlert, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export function sessionState(session, today) {
  if (session.status === "completed") return "completed";
  if (session.status === "skipped") return "skipped";
  if (session.date < today) return "missed";
  return session.date === today ? "today" : "planned";
}

const META = {
  completed: { label: "Completed", icon: CheckCircle2, className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  missed: { label: "Missed", icon: CircleAlert, className: "border-amber-300 bg-amber-50 text-amber-900" },
  skipped: { label: "Skipped", icon: SkipForward, className: "border-slate-300 bg-slate-100 text-slate-700" },
  today: { label: "Today", icon: Clock, className: "border-indigo-300 bg-indigo-50 text-indigo-800" },
  planned: { label: "Planned", icon: CircleDashed, className: "border-slate-300 bg-white text-slate-700" },
};

export function StatusBadge({ state, className, testid }) {
  const meta = META[state];
  const Icon = meta.icon;
  return (
    <span
      data-testid={testid}
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.className, className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
