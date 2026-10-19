import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, LogOut, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FieldError, TextField } from "@/components/FormField";
import { api, errorMessage } from "@/lib/api";
import { addDaysISO, currentWeekStart, weekLabel } from "@/lib/dates";
import { plural } from "@/lib/format";

const useRefresh = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["challenges"] });
};

export function CreateChallengeDialog({ open, onOpenChange }) {
  const refresh = useRefresh();
  const thisWeek = currentWeekStart();
  const nextWeek = addDaysISO(thisWeek, 7);
  const [form, setForm] = useState({ name: "", target: "3", week: thisWeek });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setForm({ name: "", target: "3", week: thisWeek }); setErrors({}); } }, [open, thisWeek]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3) { setErrors({ name: "Give your challenge a name of at least 3 characters." }); return; }
    setBusy(true);
    try {
      await api.post("/challenges", { name: form.name.trim(), target_per_member: Number(form.target), week_start: form.week });
      refresh();
      toast.success("Challenge created. Invite your peers or share the code.");
      onOpenChange(false);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl" data-testid="create-challenge-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Create a challenge</DialogTitle>
          <DialogDescription className="text-base text-slate-600">A small, shared goal for up to 8 people. Everyone's sessions count towards it together.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <TextField id="challenge-name" label="Challenge name" value={form.name} maxLength={40} placeholder="e.g. Three sessions this week"
            onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} testid="challenge-name-input" />
          <div>
            <Label htmlFor="challenge-target" className="text-sm font-semibold">Sessions each this week</Label>
            <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
              <SelectTrigger id="challenge-target" className="mt-2 h-12 rounded-lg border-slate-400 bg-white" data-testid="challenge-target-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)} data-testid={`challenge-target-option-${n}`}>{plural(n, "session")} per member</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">Week</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[[thisWeek, "This week"], [nextWeek, "Next week"]].map(([v, l]) => (
                <label key={v} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                  <input type="radio" name="challenge-week" value={v} checked={form.week === v} onChange={() => setForm({ ...form, week: v })}
                    className="h-4 w-4 accent-slate-900" data-testid={`challenge-week-${l.split(" ")[0].toLowerCase()}`} />
                  <span><span className="block font-medium">{l}</span><span className="font-mono text-xs text-slate-600">{weekLabel(v)}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <FieldError id="challenge-form-error">{errors.form}</FieldError>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="challenge-create-submit">{busy ? "Creating…" : "Create challenge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinChallengeDialog({ open, onOpenChange }) {
  const refresh = useRefresh();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCode(""); setError(""); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) { setError("Enter the code a peer shared with you."); return; }
    setBusy(true);
    try {
      await api.post("/challenges/join", { code: code.trim() });
      refresh();
      toast.success("You've joined the challenge. Support your group!");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl" data-testid="join-challenge-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Join with a code</DialogTitle>
          <DialogDescription className="text-base text-slate-600">Ask a challenge member for their code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-5">
          <TextField id="join-code" label="Challenge code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={error} testid="join-code-input" inputClassName="font-mono uppercase tracking-widest" autoComplete="off" />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="join-code-submit">{busy ? "Joining…" : "Join challenge"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteRow({ challenge, peers }) {
  const refresh = useRefresh();
  const taken = new Set([...challenge.members, ...challenge.invited].map((m) => m.id));
  const eligible = peers.filter((p) => !taken.has(p.user.id));
  const [selected, setSelected] = useState("");
  if (!challenge.spots_left) return <p className="text-sm text-slate-600">This challenge is full.</p>;
  if (!eligible.length) return <p className="text-sm text-slate-600">All your peers are already in or invited.</p>;
  const invite = async () => {
    if (!selected) { toast.error("Choose a peer to invite."); return; }
    try {
      await api.post(`/challenges/${challenge.id}/invite`, { user_id: selected });
      refresh();
      setSelected("");
      toast.success("Invitation sent");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor={`invite-${challenge.id}`} className="text-sm font-semibold">Invite a peer</Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id={`invite-${challenge.id}`} className="mt-2 h-11 rounded-lg border-slate-400 bg-white" data-testid={`invite-select-${challenge.id}`}>
            <SelectValue placeholder="Choose a peer" />
          </SelectTrigger>
          <SelectContent>
            {eligible.map((p) => (
              <SelectItem key={p.user.id} value={p.user.id} data-testid={`invite-option-${p.user.username}`}>{p.user.name} (@{p.user.username})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={invite} data-testid={`invite-button-${challenge.id}`}><UserPlus aria-hidden="true" />Invite</Button>
    </div>
  );
}

export function ChallengeCard({ challenge, peers }) {
  const refresh = useRefresh();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pct = challenge.group_target ? Math.min(100, Math.round((challenge.group_completed / challenge.group_target) * 100)) : 0;
  const reached = challenge.group_completed >= challenge.group_target;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(challenge.code);
      toast.success("Code copied");
    } catch {
      toast(`Code: ${challenge.code}`);
    }
  };
  const leave = async () => {
    await api.post(`/challenges/${challenge.id}/leave`);
    refresh();
    toast("You left the challenge");
  };
  return (
    <article aria-labelledby={`ch-${challenge.id}`} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8" data-testid={`challenge-card-${challenge.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-slate-600">{weekLabel(challenge.week_start)}</p>
          <h2 id={`ch-${challenge.id}`} className="mt-1 font-display text-2xl font-semibold text-slate-900">{challenge.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{plural(challenge.target_per_member, "session")} each · {challenge.members.length} of 8 members</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />Cooperative
        </span>
      </div>
      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-xl font-semibold text-slate-900" data-testid={`challenge-progress-${challenge.id}`}>
            Together: <span className="font-mono">{challenge.group_completed} of {challenge.group_target}</span> sessions
          </p>
          {reached && <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" aria-hidden="true" />Goal reached together</p>}
        </div>
        <Progress value={pct} className="mt-3 h-3 bg-slate-200 [&>div]:bg-emerald-600" aria-label={`Group progress: ${challenge.group_completed} of ${challenge.group_target} sessions`} />
        <p className="mt-3 text-sm text-slate-600">Support your group: every session anyone completes counts towards the shared goal.</p>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Members</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {challenge.members.map((m) => <li key={m.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">{m.name}</li>)}
          {challenge.invited.map((m) => <li key={m.id} className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-600">{m.name} (invited)</li>)}
        </ul>
      </div>
      <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 lg:grid-cols-2">
        <InviteRow challenge={challenge} peers={peers} />
        <div className="flex flex-wrap items-end justify-between gap-2 lg:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Code</span>
            <span className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-sm font-bold tracking-widest text-white" data-testid={`challenge-code-${challenge.id}`}>{challenge.code}</span>
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy challenge code" data-testid={`copy-code-${challenge.id}`}><Copy /></Button>
          </div>
          <Button variant="ghost" onClick={() => setLeaveOpen(true)} data-testid={`leave-challenge-${challenge.id}`}><LogOut aria-hidden="true" />Leave</Button>
        </div>
      </div>
      <ConfirmDialog open={leaveOpen} onOpenChange={setLeaveOpen} testid="leave-challenge-dialog" title={`Leave ${challenge.name}?`}
        description="Your completed sessions will no longer count towards this group's goal. You can rejoin with the code." confirmLabel="Leave challenge" onConfirm={leave} />
    </article>
  );
}

export function InviteCard({ challenge }) {
  const refresh = useRefresh();
  const respond = async (action) => {
    try {
      await api.post(`/challenges/${challenge.id}/${action}`);
      refresh();
      toast.success(action === "accept" ? "You've joined. Support your group!" : "Invitation declined");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid={`challenge-invite-${challenge.id}`}>
      <div>
        <p className="font-semibold text-slate-900">{challenge.name}</p>
        <p className="text-sm text-slate-700">From {challenge.owner?.name} · {weekLabel(challenge.week_start)} · {plural(challenge.target_per_member, "session")} each</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => respond("accept")} data-testid={`accept-challenge-${challenge.id}`}>Join</Button>
        <Button variant="outline" onClick={() => respond("decline")} data-testid={`decline-challenge-${challenge.id}`}>Decline</Button>
      </div>
    </li>
  );
}
