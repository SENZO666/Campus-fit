import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIFFICULTY, MUSCLE_GROUPS } from "@/lib/constants";

export function ExerciseDetailDialog({ exercise, open, onOpenChange }) {
  if (!exercise) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl p-0" data-testid="exercise-detail-dialog">
        <img src={exercise.image} alt={exercise.alt} className="aspect-[16/9] w-full rounded-t-2xl object-cover" />
        <div className="space-y-5 p-6 sm:p-8">
          <DialogHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{MUSCLE_GROUPS[exercise.group]}</Badge>
              <Badge variant="outline">{exercise.equipment_label}</Badge>
              <Badge variant="outline">{DIFFICULTY[exercise.difficulty]}</Badge>
              {exercise.quiet && <Badge variant="outline">Quiet</Badge>}
            </div>
            <DialogTitle className="pt-2 font-display text-3xl">{exercise.name}</DialogTitle>
            <DialogDescription className="text-base text-slate-600">
              {exercise.mode === "time" ? "Timed exercise" : "Counted in reps"} · sample content
            </DialogDescription>
          </DialogHeader>
          <div>
            <h3 className="font-display text-lg font-semibold">Steps</h3>
            <ol className="mt-3 space-y-3">
              {exercise.steps.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-900 font-mono text-xs font-bold text-white" aria-hidden="true">{i + 1}</span>
                  <span className="pt-0.5 text-slate-800">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Stop if you feel pain or unusual symptoms. This is general guidance, not medical advice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
