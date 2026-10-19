import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExerciseSwapDialog } from "@/components/ExerciseSwapDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { SessionEditor } from "@/components/plan/SessionEditor";
import { LockedSessions, PlanActionBar, SavedBanner, SuggestionBanner, WeekSwitch } from "@/components/plan/PlanParts";
import { useAnnounce } from "@/context/Announcer";
import { useAuth } from "@/context/AuthContext";
import { useExercises, useWeek } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { addDaysISO, currentWeekStart, formatShort, todayISO, weekDates, weekLabel } from "@/lib/dates";

const uid = () => Math.random().toString(36).slice(2, 10);
const byDateTime = (a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
const toDraft = (s) => ({
  key: s.id || uid(), date: s.date, time: s.time, template: s.template, title: s.title, duration_min: s.duration_min, items: s.items,
});

export default function PlanBuilder() {
  const { user } = useAuth();
  const { map } = useExercises();
  const qc = useQueryClient();
  const { announce } = useAnnounce();
  const today = todayISO();
  const thisWeek = currentWeekStart();
  const nextWeek = addDaysISO(thisWeek, 7);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const { data: weekData } = useWeek(weekStart);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingWeek, setPendingWeek] = useState(null);
  const [swap, setSwap] = useState(null);
  const loadedFor = useRef(null);

  const locked = useMemo(() => (weekData || []).filter((s) => s.status === "completed" || s.date < today), [weekData, today]);
  const dayOptions = weekDates(weekStart).filter((d) => d >= today);

  const suggest = useCallback(async (lockedList) => {
    const { data } = await api.post("/plan/preview", { profile: user.profile, week_start: weekStart, today });
    const taken = new Set(lockedList.filter((s) => s.status === "completed").map((s) => s.date));
    setDraft(data.filter((s) => !taken.has(s.date)).map(toDraft));
    setDirty(true);
    setSuggested(true);
    setJustSaved(false);
  }, [user.profile, weekStart, today]);

  useEffect(() => {
    if (!weekData || loadedFor.current === weekStart) return;
    loadedFor.current = weekStart;
    const editable = weekData.filter((s) => s.status !== "completed" && s.date >= today);
    if (editable.length) {
      setDraft(editable.map(toDraft));
      setDirty(false);
      setSuggested(false);
    } else {
      suggest(locked).catch((e) => setError(errorMessage(e)));
    }
  }, [weekData, weekStart, today, locked, suggest]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (key, patch) => {
    setDraft((d) => d.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setDirty(true);
    setJustSaved(false);
    setError("");
  };

  const buildSession = async (template, duration, keep = []) => {
    const { data } = await api.post("/plan/session", {
      template, duration_min: duration, offset: Math.floor(Math.random() * 20), keep_ids: keep,
    });
    return data;
  };

  const rebuild = async (session, template, duration, keep) => {
    setBusyKey(session.key);
    try {
      const data = await buildSession(template, duration, keep);
      update(session.key, { template: data.template, title: data.title, duration_min: data.duration_min, items: data.items });
      return data;
    } catch (e) {
      toast.error(errorMessage(e));
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  const resize = async (s, delta) => {
    const d = Math.min(60, Math.max(10, s.duration_min + delta));
    if (d === s.duration_min) return;
    const data = await rebuild(s, s.template, d, s.items.map((i) => i.exercise_id));
    if (data) announce(`${s.title} is now ${d} minutes with ${data.items.length} exercises.`);
  };

  const replace = async (s, template) => {
    const data = await rebuild(s, template, s.duration_min, []);
    if (data) {
      toast.success(`Replaced with ${data.title}`);
      announce(`Session replaced with ${data.title}.`);
    }
  };

  const remove = (s) => {
    const previous = draft;
    setDraft((d) => d.filter((x) => x.key !== s.key));
    setDirty(true);
    setJustSaved(false);
    toast(`${s.title} removed`, { action: { label: "Undo", onClick: () => setDraft(previous) } });
  };

  const add = async () => {
    const used = new Set(draft.map((s) => s.date));
    const date = dayOptions.find((d) => !used.has(d)) || dayOptions[0];
    try {
      const data = await buildSession("full_body", user.profile.session_length);
      setDraft((d) => [...d, toDraft({ ...data, date, time: "17:00" })]);
      setDirty(true);
      setJustSaved(false);
      announce(`Added a ${data.title} session on ${formatShort(date)}.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const save = async () => {
    setError("");
    const invalid = draft.find((s) => !s.time || s.date < today || !s.items.length);
    if (invalid) {
      setError(`Check ${invalid.title} on ${formatShort(invalid.date)}: it needs a start time and a day from today onwards.`);
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/weeks/${weekStart}`, { sessions: draft.map(({ key, ...s }) => s), today });
      qc.setQueryData(["week", weekStart], data);
      qc.invalidateQueries({ queryKey: ["progress"] });
      setDraft(data.filter((s) => s.status !== "completed" && s.date >= today).map(toDraft));
      setDirty(false);
      setSuggested(false);
      setJustSaved(true);
      toast.success("Plan saved", { description: "Your calendar is up to date." });
      announce("Plan saved. Your calendar has been updated.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const doSwitch = (ws) => {
    loadedFor.current = null;
    setDraft(null);
    setDirty(false);
    setJustSaved(false);
    setSuggested(false);
    setError("");
    setWeekStart(ws);
  };
  const switchWeek = (ws) => {
    if (ws === weekStart) return;
    if (dirty) setPendingWeek(ws);
    else doSwitch(ws);
  };

  const leaveOpen = blocker.state === "blocked" || !!pendingWeek;
  const stay = () => { if (blocker.state === "blocked") blocker.reset(); setPendingWeek(null); };
  const leave = () => {
    if (blocker.state === "blocked") blocker.proceed();
    else if (pendingWeek) doSwitch(pendingWeek);
    setPendingWeek(null);
  };

  const sorted = draft ? [...draft].sort(byDateTime) : [];
  const swapSession = swap && draft?.find((s) => s.key === swap.key);

  return (
    <div className="pb-40 sm:pb-32">
      <PageHeader
        eyebrow={`Weekly plan · ${weekLabel(weekStart)}`}
        title="Plan your week"
        description="Review the suggested sessions, change anything that doesn't fit, then save. Your calendar updates straight away."
        testid="plan-title"
        actions={
          <WeekSwitch value={weekStart} onChange={switchWeek} options={[
            { id: "this", value: thisWeek, label: "This week", hint: weekLabel(thisWeek) },
            { id: "next", value: nextWeek, label: "Next week", hint: weekLabel(nextWeek) },
          ]} />
        }
      />
      {suggested && <SuggestionBanner />}
      {justSaved && <SavedBanner />}
      {weekStart === thisWeek && dayOptions.length < 7 && (
        <p className="mb-6 text-sm text-slate-600">Days that have already passed this week can't be planned.</p>
      )}

      {!draft ? (
        <div className="grid gap-5 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={CalendarPlus} title={dayOptions.length ? "No sessions in this plan yet" : "This week is almost over"} testid="plan-empty-state"
          action={dayOptions.length
            ? <Button onClick={add} data-testid="plan-empty-add-button"><Plus aria-hidden="true" />Add a session</Button>
            : <Button onClick={() => switchWeek(nextWeek)} data-testid="plan-next-week-button">Plan next week</Button>}>
          {dayOptions.length ? "Add a session, or reset to the suggestion from your profile." : "All your training days have passed. Plan next week instead."}
        </EmptyState>
      ) : (
        <ol className="grid gap-5 lg:grid-cols-2" aria-label="Sessions in this plan">
          {sorted.map((s, i) => (
            <li key={s.key}>
              <SessionEditor
                session={s} number={i + 1} dayOptions={dayOptions} busy={busyKey === s.key} exerciseMap={map}
                onChange={(patch) => update(s.key, patch)}
                onResize={(delta) => resize(s, delta)}
                onReplace={(t) => replace(s, t)}
                onSwap={(index, exerciseId) => setSwap({ key: s.key, index, exerciseId })}
                onRemove={() => remove(s)}
              />
            </li>
          ))}
        </ol>
      )}
      {draft && sorted.length > 0 && dayOptions.length > 0 && (
        <Button variant="outline" className="mt-6" onClick={add} data-testid="plan-add-session-button">
          <Plus aria-hidden="true" />Add a session
        </Button>
      )}
      <LockedSessions sessions={locked} today={today} />

      <PlanActionBar dirty={dirty} saving={saving} error={error} onSave={save}
        onReset={() => suggest(locked).catch((e) => setError(errorMessage(e)))} />

      <ExerciseSwapDialog
        open={!!swap} onOpenChange={(o) => !o && setSwap(null)} exerciseId={swap?.exerciseId}
        onPick={(item, ex) => {
          update(swap.key, { items: swapSession.items.map((it, i) => (i === swap.index ? item : it)) });
          toast.success(`Swapped in ${ex.name}`);
          announce(`Swapped in ${ex.name}.`);
        }}
      />
      <ConfirmDialog
        open={leaveOpen} onOpenChange={(o) => !o && stay()} testid="unsaved-changes-dialog"
        title="Leave without saving?" confirmLabel="Leave without saving" cancelLabel="Stay and save"
        description="Your plan for this week has unsaved changes. If you leave now, they'll be lost."
        onConfirm={leave} onCancel={stay}
      />
    </div>
  );
}
