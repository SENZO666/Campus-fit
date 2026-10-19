import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CheckCircle2, Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCountdown } from "@/components/workout/useCountdown";
import { api, errorMessage } from "@/lib/api";
import { EFFORT } from "@/lib/constants";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RestPanel({ seconds, paused, nextLabel, onDone, announce }) {
  const [left, setLeft] = useCountdown(seconds, !paused, onDone);
  useEffect(() => {
    if (left === 10) announce("10 seconds of rest left.");
  }, [left, announce]);
  return (
    <div data-testid="rest-panel" className="animate-rise">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Rest</p>
      <p role="timer" aria-live="off" className="mt-2 font-mono text-7xl font-bold tracking-tight text-white sm:text-8xl" data-testid="rest-timer">
        {clock(left)}
      </p>
      <p className="mt-3 text-slate-300">Next: <span className="font-semibold text-white">{nextLabel}</span></p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="darkOutline" onClick={() => setLeft((l) => Math.max(0, l - 15))} data-testid="rest-minus-button" aria-label="Shorten rest by 15 seconds">−15 s</Button>
        <Button variant="darkOutline" onClick={() => setLeft((l) => Math.min(600, l + 15))} data-testid="rest-plus-button" aria-label="Add 15 seconds of rest">+15 s</Button>
        <Button variant="accent" onClick={onDone} data-testid="rest-skip-button"><SkipForward aria-hidden="true" />Skip rest</Button>
      </div>
    </div>
  );
}

export function WorkTimer({ seconds, paused, onDone }) {
  const [running, setRunning] = useState(false);
  const [left] = useCountdown(seconds, running && !paused, onDone);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-5">
      <p role="timer" aria-live="off" className="font-mono text-6xl font-bold text-white" data-testid="work-timer">{clock(left)}</p>
      <Button variant="darkOutline" size="lg" onClick={() => setRunning(!running)} data-testid="work-timer-toggle">
        {running ? <><Pause aria-hidden="true" />Pause timer</> : <><Play aria-hidden="true" />{left < seconds ? "Resume timer" : "Start timer"}</>}
      </Button>
    </div>
  );
}

export function ExerciseStage({ exercise, item, setNo, paused, onSetDone, timerKey }) {
  const target = item.duration_sec ? `${item.duration_sec} seconds` : `${item.reps} reps`;
  return (
    <div className="animate-rise" data-testid="exercise-stage">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300" data-testid="workout-set-label">
        Set {setNo} of {item.sets}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl" data-testid="workout-exercise-name">{exercise.name}</h1>
      <p className="mt-3 font-mono text-xl text-slate-100" data-testid="workout-target">{target} · {item.rest_sec} s rest after</p>
      {item.duration_sec && <WorkTimer key={timerKey} seconds={item.duration_sec} paused={paused} onDone={onSetDone} />}
      <ol className="mt-8 space-y-3" aria-label="Steps">
        {exercise.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-slate-200">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/25 font-mono text-xs" aria-hidden="true">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Button variant="accent" size="xl" className="mt-10" onClick={onSetDone} data-testid="set-done-button">
        <Check aria-hidden="true" />{item.sets > 1 ? "Set done" : "Done"}
      </Button>
    </div>
  );
}

export function CompletionForm({ session, items, doneCount, defaultShared, onSaved }) {
  const [difficulty, setDifficulty] = useState(null);
  const [shared, setShared] = useState(defaultShared);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/sessions/${session.id}/complete`, { difficulty, shared, items });
      onSaved({ shared });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="finish-title" className="mx-auto max-w-2xl animate-rise" data-testid="completion-form">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Last step</p>
      <h1 id="finish-title" ref={headingRef} tabIndex={-1} className="no-focus-ring mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Finish your session
      </h1>
      <p className="mt-4 text-lg text-slate-300" data-testid="completion-summary">
        You did {doneCount} of {items.length} exercises in {session.title}.
      </p>
      <fieldset className="mt-10">
        <legend className="text-base font-semibold text-white">How hard did it feel? <span className="font-normal text-slate-300">(optional)</span></legend>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {EFFORT.map((e) => {
            const on = difficulty === e.value;
            return (
              <label key={e.value} data-testid={`effort-option-${e.value}`}
                className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-1 py-4 text-center transition-colors",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-300",
                  on ? "border-emerald-400 bg-emerald-400/15" : "border-white/15 hover:border-white/40")}>
                <input type="radio" name="effort" className="sr-only" checked={on} onChange={() => setDifficulty(e.value)} />
                <span className="font-mono text-2xl font-bold">{e.value}</span>
                <span className="text-xs text-slate-200">{e.label}</span>
                {on && <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-8 flex items-start justify-between gap-6 rounded-2xl border border-white/15 bg-white/[0.04] p-5">
        <div>
          <Label htmlFor="share-switch" className="text-base font-semibold text-white">Share with my peers</Label>
          <p id="share-help" className="mt-1 text-sm text-slate-300">Only accepted peers see the session name and length. Off unless you turn it on.</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-slate-200" aria-hidden="true">{shared ? "On" : "Off"}</span>
          <Switch id="share-switch" checked={shared} onCheckedChange={setShared} aria-describedby="share-help" data-testid="share-switch"
            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-600" />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-300">{error}</p>}
      <div className="mt-10 flex flex-wrap gap-3">
        <Button variant="accent" size="xl" onClick={submit} disabled={busy} data-testid="mark-complete-button">
          <CheckCircle2 aria-hidden="true" />{busy ? "Saving…" : "Mark as complete"}
        </Button>
        <Button asChild variant="darkGhost" size="xl">
          <Link to="/dashboard" data-testid="leave-without-saving-link">Leave without saving</Link>
        </Button>
      </div>
    </section>
  );
}

export function Celebration({ session, shared }) {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <section className="mx-auto max-w-xl py-10 text-center" data-testid="celebration">
      <div className="relative mx-auto h-28 w-28" aria-hidden="true">
        <span className="absolute inset-0 animate-ring-out rounded-full bg-emerald-400/40" />
        <span className="relative grid h-28 w-28 animate-pop-in place-items-center rounded-full bg-emerald-400 text-slate-950">
          <Check className="h-14 w-14" strokeWidth={3} />
        </span>
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="no-focus-ring mt-10 font-display text-4xl font-bold tracking-tight sm:text-5xl">Session complete</h1>
      <p className="mt-4 text-lg text-slate-300">Nice work fitting {session.title} into your week. Every session counts.</p>
      {shared && <p className="mt-2 text-sm text-emerald-300">Shared with your peers.</p>}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild variant="accent" size="xl"><Link to="/dashboard" data-testid="celebration-dashboard-link">Back to dashboard</Link></Button>
        <Button asChild variant="darkOutline" size="xl"><Link to="/progress" data-testid="celebration-progress-link">See progress</Link></Button>
      </div>
    </section>
  );
}
