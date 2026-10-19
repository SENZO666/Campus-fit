import { Link } from "react-router-dom";
import { CheckCircle2, CircleDot, Lock, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/FormField";
import { StatusBadge, sessionState } from "@/components/StatusBadge";
import { formatShort } from "@/lib/dates";

export function WeekSwitch({ options, value, onChange }) {
  return (
    <div role="group" aria-label="Choose a week" className="inline-flex rounded-full border border-slate-300 bg-white p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          data-testid={`week-switch-${o.id}`}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${value === o.value ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
          {o.label} <span className="font-mono text-xs font-normal opacity-80">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

export function SuggestionBanner() {
  return (
    <p className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950" data-testid="plan-suggestion-banner">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>This is a suggested plan based on your profile. Adjust anything you like. Nothing is saved until you press <strong>Save plan</strong>.</span>
    </p>
  );
}

export function SavedBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" data-testid="plan-saved-banner">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Plan saved. Your calendar is up to date.</p>
      <Button asChild size="sm" variant="outline"><Link to="/calendar" data-testid="plan-view-calendar-link">View calendar</Link></Button>
    </div>
  );
}

export function LockedSessions({ sessions, today }) {
  if (!sessions.length) return null;
  return (
    <section aria-labelledby="locked-title" className="mt-12">
      <h2 id="locked-title" className="flex items-center gap-2 font-display text-lg font-semibold text-slate-900">
        <Lock className="h-4 w-4" aria-hidden="true" />Already in this week
      </h2>
      <p className="mt-1 text-sm text-slate-600">Completed sessions and days that have passed can't be edited here. Use the calendar to move an open session.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <p className="font-semibold text-slate-900">{s.title}</p>
              <p className="font-mono text-xs text-slate-600">{formatShort(s.date)} · {s.time}</p>
            </div>
            <StatusBadge state={sessionState(s, today)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PlanActionBar({ dirty, saving, error, onSave, onReset }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold" data-testid="plan-save-status">
            {dirty
              ? <><CircleDot className="h-4 w-4 text-amber-700" aria-hidden="true" />Unsaved changes</>
              : <><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />All changes saved</>}
          </p>
          <FieldError id="plan-save-error">{error}</FieldError>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} disabled={saving} data-testid="plan-reset-button">
            <RotateCcw aria-hidden="true" />Reset to suggestion
          </Button>
          <Button size="lg" onClick={onSave} disabled={saving || !dirty} data-testid="plan-save-button">
            <Save aria-hidden="true" />{saving ? "Saving…" : "Save plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
