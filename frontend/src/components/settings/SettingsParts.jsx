import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FieldError, TextField } from "@/components/FormField";
import { PROFILE_STEPS, ProfileField, validateProfile } from "@/components/profile/ProfileFields";
import { useAnnounce } from "@/context/Announcer";
import { useAuth } from "@/context/AuthContext";
import { useHidden } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { currentWeekStart, todayISO } from "@/lib/dates";

const Card = ({ title, description, children, testid }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" data-testid={testid}>
    <h2 className="font-display text-2xl font-semibold text-slate-900">{title}</h2>
    {description && <p className="mt-1 text-slate-600">{description}</p>}
    <div className="mt-6">{children}</div>
  </section>
);

export function AccountForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, username: user.username });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Enter the name peers will see.";
    if (!/^[a-z0-9_]{3,20}$/.test(form.username.trim().toLowerCase())) errs.username = "Use 3–20 lowercase letters, numbers or underscores.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const { data } = await api.put("/me/account", { name: form.name.trim(), username: form.username.trim().toLowerCase() });
      setUser(data);
      toast.success("Account details saved");
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="Account" description={`Signed in as ${user.email}.`} testid="settings-account">
      <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
        <TextField id="settings-name" label="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} testid="settings-name-input" />
        <TextField id="settings-username" label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} error={errors.username} testid="settings-username-input" />
        <div className="sm:col-span-2">
          <FieldError id="settings-account-error">{errors.form}</FieldError>
          <Button type="submit" disabled={busy} data-testid="settings-account-save">{busy ? "Saving…" : "Save account details"}</Button>
        </div>
      </form>
    </Card>
  );
}

const SECTION_TITLES = { goal: "Goal", level: "Experience", days: "Days and start times", length: "Session length", equipment: "Equipment", place: "Where you train" };

export function TrainingForm() {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const { announce } = useAnnounce();
  const [draft, setDraft] = useState(user.profile);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [offerUpdate, setOfferUpdate] = useState(false);

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setErrors({}); };
  const save = async (e) => {
    e.preventDefault();
    const errs = validateProfile(draft);
    setErrors(errs);
    if (Object.keys(errs).length) { announce(Object.values(errs)[0]); return; }
    setBusy(true);
    try {
      const { data } = await api.put("/me/profile", draft);
      setUser(data);
      setOfferUpdate(true);
      toast.success("Training preferences saved");
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const updatePlan = async () => {
    try {
      await api.post(`/weeks/${currentWeekStart()}/regenerate`, { today: todayISO() });
      qc.invalidateQueries({ queryKey: ["week"] });
      setOfferUpdate(false);
      toast.success("Upcoming sessions updated to match your preferences");
      announce("Upcoming sessions updated.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card title="Training preferences" description="Your plan follows these. Completed sessions are never changed." testid="settings-training">
      {offerUpdate && (
        <div role="status" className="mb-8 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="settings-update-plan-banner">
          <p className="text-sm text-indigo-950">Update this week's upcoming sessions to match your new preferences?</p>
          <div className="flex gap-2">
            <Button onClick={updatePlan} data-testid="settings-update-plan-button"><RefreshCw aria-hidden="true" />Update my plan</Button>
            <Button variant="outline" onClick={() => setOfferUpdate(false)} data-testid="settings-keep-plan-button">Keep current plan</Button>
          </div>
        </div>
      )}
      <form onSubmit={save} noValidate className="space-y-10">
        {PROFILE_STEPS.map((step) => (
          <div key={step}>
            <h3 className="mb-4 font-display text-lg font-semibold text-slate-900">{SECTION_TITLES[step]}</h3>
            <ProfileField step={step} draft={draft} set={set} errors={errors} />
          </div>
        ))}
        <FieldError id="settings-training-error">{errors.form}</FieldError>
        <Button type="submit" size="lg" disabled={busy} data-testid="settings-training-save">{busy ? "Saving…" : "Save training preferences"}</Button>
      </form>
    </Card>
  );
}

const PRIVACY = [
  { key: "share_by_default", label: "Share completed workouts by default", text: "When on, the share switch starts on after a workout. You can still change it each time." },
  { key: "allow_requests", label: "Allow peer requests", text: "When off, nobody can send you a new peer request. Existing peers stay." },
  { key: "show_streaks", label: "Show weekly streaks", text: "Hide streaks if they feel like pressure. Your progress is still saved." },
];

export function PrivacyForm() {
  const { user, setUser } = useAuth();
  const { announce } = useAnnounce();
  const toggle = async (key, value) => {
    try {
      const { data } = await api.put("/me/privacy", { ...user.privacy, [key]: value });
      setUser(data);
      toast.success("Privacy settings saved");
      announce("Privacy settings saved.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  return (
    <Card title="Privacy" description="Plain controls for what gets shared and with whom." testid="settings-privacy">
      <p className="mb-6 flex items-start gap-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-800">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Always private: your schedule, goal and progress. Peers only see workouts you choose to share, and challenge members only see the group total.
      </p>
      <ul className="divide-y divide-slate-100">
        {PRIVACY.map((p) => {
          const on = user.privacy[p.key];
          return (
            <li key={p.key} className="flex items-start justify-between gap-6 py-5">
              <div>
                <label htmlFor={`privacy-${p.key}`} className="font-semibold text-slate-900">{p.label}</label>
                <p id={`privacy-${p.key}-help`} className="mt-1 text-sm text-slate-600">{p.text}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="w-7 text-sm font-semibold text-slate-700" aria-hidden="true">{on ? "On" : "Off"}</span>
                <Switch id={`privacy-${p.key}`} checked={on} onCheckedChange={(v) => toggle(p.key, v)}
                  aria-describedby={`privacy-${p.key}-help`} data-testid={`privacy-switch-${p.key}`} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function HiddenList() {
  const qc = useQueryClient();
  const { data = [] } = useHidden();
  const undo = async (u, kind) => {
    await api.delete(`/users/${u.id}/${kind}`);
    ["hidden", "feed", "peers"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    toast.success(kind === "mute" ? `${u.name} unmuted` : `${u.name} unblocked`);
  };
  return (
    <Card title="Muted and blocked" description="Muted accounts' activity is hidden from your feed. Blocked accounts can't contact you." testid="settings-hidden">
      {data.length ? (
        <ul className="divide-y divide-slate-100">
          {data.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-4" data-testid={`hidden-${u.username}`}>
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="font-mono text-sm text-slate-600">@{u.username} · {[u.muted && "Muted", u.blocked && "Blocked"].filter(Boolean).join(", ")}</p>
              </div>
              <div className="flex gap-2">
                {u.muted && <Button variant="outline" size="sm" onClick={() => undo(u, "mute")} data-testid={`unmute-${u.username}`}>Unmute</Button>}
                {u.blocked && <Button variant="outline" size="sm" onClick={() => undo(u, "block")} data-testid={`unblock-${u.username}`}>Unblock</Button>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-600" data-testid="hidden-empty">You haven't muted or blocked anyone.</p>
      )}
    </Card>
  );
}
