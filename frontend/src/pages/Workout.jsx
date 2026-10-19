import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Repeat, ShieldAlert, SkipForward, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExerciseSwapDialog } from "@/components/ExerciseSwapDialog";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/SkipLink";
import { Celebration, CompletionForm, ExerciseStage, RestPanel } from "@/components/workout/WorkoutParts";
import { useAnnounce } from "@/context/Announcer";
import { useAuth } from "@/context/AuthContext";
import { useExercises } from "@/hooks/queries";
import { api } from "@/lib/api";

function Frame({ children, header }) {
  return (
    <div className="on-dark flex min-h-screen flex-col bg-obsidian text-white">
      <SkipLink />
      {header || (
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Logo inverted />
            <Button asChild variant="darkGhost"><Link to="/dashboard" data-testid="workout-back-link">Back to dashboard</Link></Button>
          </div>
        </header>
      )}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">{children}</main>
      <footer className="border-t border-white/10">
        <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-5 text-sm text-slate-300 sm:px-6" data-testid="workout-safety-note">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          Stop if you feel pain, dizziness or anything unusual. CampusFit gives general guidance only and doesn't replace medical advice.
        </p>
      </footer>
    </div>
  );
}

function WorkoutHeader({ title, minutes, index, count, percent, paused, finished, onEnd, onPause }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-obsidian/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Button variant="darkGhost" onClick={onEnd} disabled={finished} data-testid="workout-end-button"><X aria-hidden="true" />End workout</Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display font-semibold">{title}</p>
          <p className="font-mono text-xs text-slate-300">{minutes} min planned</p>
        </div>
        <Button variant="darkOutline" onClick={onPause} disabled={finished} aria-pressed={paused} data-testid="workout-pause-button">
          {paused ? <><Play aria-hidden="true" />Resume</> : <><Pause aria-hidden="true" />Pause</>}
        </Button>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="flex justify-between font-mono text-xs text-slate-300">
          <span data-testid="workout-progress-label">{finished ? "All exercises done" : `Exercise ${index + 1} of ${count}`}</span>
          <span data-testid="workout-progress-percent">{percent}% done</span>
        </div>
        <div role="progressbar" aria-label="Workout progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </header>
  );
}

function Player({ session, exerciseMap }) {
  const { user } = useAuth();
  const { announce } = useAnnounce();
  const qc = useQueryClient();
  const [items, setItems] = useState(session.items);
  const [index, setIndex] = useState(0);
  const [setNo, setSetNo] = useState(1);
  const [phase, setPhase] = useState("work");
  const [paused, setPaused] = useState(false);
  const [doneIdx, setDoneIdx] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [saved, setSaved] = useState(null);

  const item = items[index];
  const exercise = item && exerciseMap[item.exercise_id];
  const totalSets = items.reduce((a, i) => a + i.sets, 0);
  const passed = phase === "finish"
    ? totalSets
    : items.slice(0, index).reduce((a, i) => a + i.sets, 0) + (setNo - 1) + (phase === "rest" ? 1 : 0);
  const percent = Math.round((passed / totalSets) * 100);
  const nameAt = (i) => exerciseMap[items[i]?.exercise_id]?.name;

  const goToExercise = useCallback((i) => {
    if (i >= items.length) {
      setPhase("finish");
      announce("That was the last exercise. Finish your session.");
      return;
    }
    setIndex(i);
    setSetNo(1);
    setPhase("work");
    announce(`Exercise ${i + 1} of ${items.length}: ${nameAt(i)}.`);
  }, [items, announce]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterRest = useCallback(() => {
    if (setNo < item.sets) {
      setSetNo(setNo + 1);
      setPhase("work");
      announce(`Rest over. ${exercise.name}, set ${setNo + 1} of ${item.sets}.`);
    } else {
      goToExercise(index + 1);
    }
  }, [setNo, item, exercise, index, goToExercise, announce]);

  const setDone = useCallback(() => {
    const lastSet = setNo >= item.sets;
    if (lastSet) setDoneIdx((d) => (d.includes(index) ? d : [...d, index]));
    if (lastSet && index === items.length - 1) {
      goToExercise(items.length);
      return;
    }
    if (item.rest_sec > 0) {
      setPhase("rest");
      announce(`Rest for ${item.rest_sec} seconds.`);
    } else {
      afterRest();
    }
  }, [setNo, item, index, items.length, goToExercise, afterRest, announce]);

  const substitute = (newItem, ex) => {
    setItems(items.map((it, i) => (i === index ? newItem : it)));
    setSetNo(1);
    setPhase("work");
    toast.success(`Swapped in ${ex.name}`);
    announce(`Swapped in ${ex.name}.`);
  };

  const onSaved = ({ shared }) => {
    ["week", "progress", "feed", "challenges"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    setSaved({ shared });
    announce("Session marked as complete.");
  };

  const nextLabel = setNo < (item?.sets || 0)
    ? `${exercise?.name}, set ${setNo + 1} of ${item.sets}`
    : nameAt(index + 1) || "Finish";

  const header = (
    <WorkoutHeader title={session.title} minutes={session.duration_min} index={index} count={items.length} percent={percent}
      paused={paused} finished={phase === "finish"} onEnd={() => setDialog("end")} onPause={() => setPaused(!paused)} />
  );

  if (saved) return <Frame><Celebration session={session} shared={saved.shared} /></Frame>;

  return (
    <Frame header={header}>
      {phase === "finish" ? (
        <CompletionForm session={session} items={items} doneCount={doneIdx.length}
          defaultShared={user.privacy?.share_by_default || false} onSaved={onSaved} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            <img key={exercise.id} src={exercise.image} alt={exercise.alt} data-testid="workout-exercise-image"
              className="aspect-[4/3] w-full animate-rise rounded-2xl border border-white/10 object-cover" />
            <p className="mt-2 text-xs text-slate-400">Sample photo. Follow the written steps for form.</p>
          </div>
          <div className="lg:col-span-6">
            {phase === "rest" ? (
              <RestPanel key={`${index}-${setNo}`} seconds={item.rest_sec} paused={paused} nextLabel={nextLabel} onDone={afterRest} announce={announce} />
            ) : (
              <ExerciseStage exercise={exercise} item={item} setNo={setNo} paused={paused} onSetDone={setDone} timerKey={`${index}-${setNo}-${item.exercise_id}`} />
            )}
            <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
              <Button variant="darkOutline" onClick={() => setDialog("swap")} data-testid="workout-substitute-button">
                <Repeat aria-hidden="true" />Substitute
              </Button>
              <Button variant="darkOutline" onClick={() => goToExercise(index + 1)} data-testid="workout-skip-exercise-button">
                <SkipForward aria-hidden="true" />Skip exercise
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={paused} onOpenChange={(o) => !o && setPaused(false)}>
        <DialogContent className="rounded-2xl" data-testid="paused-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Workout paused</DialogTitle>
            <DialogDescription className="text-base text-slate-600">Take the time you need. Timers are stopped.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setPaused(false)} data-testid="paused-resume-button"><Play aria-hidden="true" />Resume</Button>
            <Button size="lg" variant="outline" onClick={() => { setPaused(false); setDialog("end"); }} data-testid="paused-end-button">End workout</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ExerciseSwapDialog open={dialog === "swap"} onOpenChange={(o) => !o && setDialog(null)} exerciseId={item?.exercise_id} onPick={substitute} />
      <ConfirmDialog
        open={dialog === "end"} onOpenChange={(o) => !o && setDialog(null)} testid="end-workout-dialog"
        title="End this workout?" confirmLabel="End and review" cancelLabel="Keep going"
        description={`You've finished ${doneIdx.length} of ${items.length} exercises. You can still mark the session as complete, or leave it for later.`}
        onConfirm={() => goToExercise(items.length)}
      />
    </Frame>
  );
}

export default function Workout() {
  const { sessionId } = useParams();
  const { map, isLoading: exLoading } = useExercises();
  const { data: session, isLoading, isError } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data),
    staleTime: 0,
    retry: false,
  });

  if (isLoading || exLoading) return <Frame><p className="font-mono text-slate-300" role="status">Loading your session…</p></Frame>;
  if (isError || !session) {
    return (
      <Frame>
        <h1 className="font-display text-3xl font-bold">We couldn't find that session</h1>
        <p className="mt-3 text-slate-300">It may have been moved or removed.</p>
        <Button asChild variant="accent" size="lg" className="mt-8"><Link to="/calendar">Open calendar</Link></Button>
      </Frame>
    );
  }
  if (session.status === "completed") {
    return (
      <Frame>
        <h1 className="font-display text-3xl font-bold" data-testid="workout-already-complete">This session is already complete</h1>
        <p className="mt-3 text-slate-300">Nice work. Your progress page has the details.</p>
        <Button asChild variant="accent" size="lg" className="mt-8"><Link to="/progress">See progress</Link></Button>
      </Frame>
    );
  }
  return <Player session={session} exerciseMap={map} />;
}
