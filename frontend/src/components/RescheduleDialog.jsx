import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, TextField } from "@/components/FormField";
import { useSessionActions } from "@/hooks/useSessionActions";
import { errorMessage } from "@/lib/api";
import { todayISO } from "@/lib/dates";

export function RescheduleDialog({ session, open, onOpenChange }) {
  const { reschedule } = useSessionActions();
  const today = todayISO();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && open) {
      setDate(session.date < today ? today : session.date);
      setTime(session.time);
      setErrors({});
    }
  }, [session, open, today]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!date) errs.date = "Choose a date.";
    else if (date < today) errs.date = "Choose today or a later date.";
    if (!time) errs.time = "Choose a start time.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await reschedule(session, date, time);
      onOpenChange(false);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reschedule-dialog" className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Reschedule session</DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            {session?.title} · {session?.duration_min} min. Pick a day and time that suits you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <TextField id="reschedule-date" label="New date" type="date" min={today} value={date}
            onChange={(e) => setDate(e.target.value)} error={errors.date} testid="reschedule-date-input" />
          <TextField id="reschedule-time" label="Start time" type="time" value={time}
            onChange={(e) => setTime(e.target.value)} error={errors.time} testid="reschedule-time-input" inputClassName="font-mono" />
          <FieldError id="reschedule-form-error">{errors.form}</FieldError>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="reschedule-cancel-button">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="reschedule-save-button">{busy ? "Saving…" : "Save new time"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
