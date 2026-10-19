import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/FormField";
import { api, errorMessage } from "@/lib/api";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportDialog({ person, open, onOpenChange }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setReason(""); setDetails(""); setError(""); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) { setError("Choose a reason for your report."); return; }
    setBusy(true);
    try {
      await api.post("/reports", { user_id: person.id, reason, details });
      toast.success("Report sent. An admin will review it.");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl" data-testid="report-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Report {person?.name}</DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Reports go to the CampusFit admin. {person?.name} won't see who reported them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset aria-describedby={error ? "report-error" : undefined}>
            <legend className="text-sm font-semibold text-slate-900">Reason</legend>
            <div className="mt-3 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                  <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)}
                    className="h-4 w-4 accent-slate-900" data-testid={`report-reason-${r.split(" ")[0].toLowerCase()}`} />
                  <span className="text-slate-900">{r}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="report-details" className="text-sm font-semibold">Details (optional)</Label>
            <Textarea id="report-details" value={details} maxLength={500} onChange={(e) => setDetails(e.target.value)}
              className="mt-2 min-h-24 rounded-lg border-slate-400" data-testid="report-details-input" />
          </div>
          <FieldError id="report-error">{error}</FieldError>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="report-submit-button">{busy ? "Sending…" : "Send report"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
