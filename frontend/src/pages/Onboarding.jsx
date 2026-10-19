import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FieldError } from "@/components/FormField";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/SkipLink";
import { WeekPreview } from "@/components/WeekPreview";
import { EMPTY_PROFILE, PROFILE_STEPS, ProfileField, validateStep } from "@/components/profile/ProfileFields";
import { useAnnounce } from "@/context/Announcer";
import { useAuth } from "@/context/AuthContext";
import { useExercises } from "@/hooks/queries";
import { api, errorMessage } from "@/lib/api";
import { EQUIPMENT, GOALS, LEVELS, PLACES, labelFor } from "@/lib/constants";

const COPY = {
  goal: { label: "Goal", question: "What would you most like from training this term?", why: "Your goal decides which kinds of sessions we suggest first." },
  level: { label: "Experience", question: "How would you describe your experience right now?", why: "We match exercise difficulty, sets and rest to where you are today." },
  days: { label: "Days and times", question: "Which days can you realistically train this week, and when?", why: "Pick times between lectures. A few realistic days work better than an ambitious plan." },
  length: { label: "Session length", question: "How long can a typical session be?", why: "Short sessions count. We fit the exercises to the time you have." },
  equipment: { label: "Equipment", question: "What equipment can you use?", why: "If you choose no equipment, we never suggest exercises that need it." },
  place: { label: "Place", question: "Where will you usually train?", why: "In a residence room we only suggest quiet exercises. Machines only appear at a gym." },
};

function usePreview(draft) {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const days = draft.days.filter((d) => d.time);
    if (!days.length) { setPreview([]); return undefined; }
    const profile = {
      goal: draft.goal || "habit", level: draft.level || "beginner", equipment: draft.equipment || "none",
      place: draft.place || "home", session_length: draft.session_length, days,
    };
    setLoading(true);
    const t = setTimeout(() => {
      api.post("/plan/preview", { profile }).then((r) => setPreview(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [draft]);
  return { preview, loading };
}

function PreviewPanel({ draft, preview, loading, exerciseMap }) {
  const chips = [
    draft.goal && labelFor(GOALS, draft.goal), draft.level && labelFor(LEVELS, draft.level),
    draft.equipment && labelFor(EQUIPMENT, draft.equipment), draft.place && labelFor(PLACES, draft.place),
  ].filter(Boolean);
  return (
    <aside aria-labelledby="preview-title" className="on-dark bg-obsidian px-5 py-10 text-white sm:px-10 lg:sticky lg:top-0 lg:col-span-5 lg:h-screen lg:overflow-y-auto lg:px-12 lg:py-14">
      <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Live preview</p>
      <h2 id="preview-title" className="mt-2 font-display text-2xl font-bold sm:text-3xl">Your suggested week</h2>
      <p className="mt-2 text-sm text-slate-300">Updates as you answer. You can change anything before saving.</p>
      {chips.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Your answers so far">
          {chips.map((c) => <li key={c} className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200">{c}</li>)}
        </ul>
      )}
      <div className="mt-8">
        {draft.days.length ? (
          <WeekPreview sessions={preview} exerciseMap={exerciseMap} loading={loading} />
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-slate-300" data-testid="preview-empty">
            Choose your available days to see sessions appear here.
          </p>
        )}
      </div>
    </aside>
  );
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const { map } = useExercises();
  const { announce } = useAnnounce();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => user.profile || EMPTY_PROFILE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const headingRef = useRef(null);
  const { preview, loading } = usePreview(draft);
  const key = PROFILE_STEPS[step];
  const copy = COPY[key];
  const total = PROFILE_STEPS.length;
  const isLast = step === total - 1;

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const set = (patch) => { setDraft((d) => ({ ...d, ...patch })); setErrors({}); };

  const next = async (e) => {
    e.preventDefault();
    const errs = validateStep(key, draft);
    setErrors(errs);
    if (Object.keys(errs).length) { announce(Object.values(errs)[0]); return; }
    if (!isLast) { setStep(step + 1); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/me/profile", draft);
      setUser(data);
      navigate("/plan", { state: { fresh: true } });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-12">
      <SkipLink />
      <main id="main-content" tabIndex={-1} className="flex flex-col px-5 py-6 sm:px-10 lg:col-span-7 lg:min-h-screen lg:px-16 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <p className="font-mono text-sm text-slate-600" data-testid="onboarding-step-indicator">Step {step + 1} of {total}</p>
        </div>
        <Progress value={((step + 1) / total) * 100} className="mt-6 h-1.5 bg-slate-200" aria-label={`Setup progress: step ${step + 1} of ${total}`} />
        <form onSubmit={next} noValidate className="mx-auto flex w-full max-w-xl flex-1 flex-col py-12 lg:py-16">
          <p className="font-label text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
            Question {step + 1} · {copy.label}
          </p>
          <h1 ref={headingRef} tabIndex={-1} data-testid="onboarding-question"
            className="no-focus-ring mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {copy.question}
          </h1>
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950" data-testid="onboarding-why">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Why we ask:</strong> {copy.why}</span>
          </p>
          <div key={key} className="mt-10 animate-rise">
            <ProfileField step={key} draft={draft} set={set} errors={errors} />
          </div>
          <FieldError id="onboarding-form-error">{errors.form}</FieldError>
          <div className="mt-auto flex items-center justify-between gap-3 pt-12">
            <Button type="button" variant="ghost" size="lg" onClick={() => setStep(step - 1)} disabled={step === 0} data-testid="onboarding-back-button">
              <ArrowLeft aria-hidden="true" />Back
            </Button>
            <Button type="submit" size="lg" disabled={saving} data-testid="onboarding-next-button">
              {isLast ? (saving ? "Saving…" : "See my plan") : "Continue"}<ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </form>
      </main>
      <PreviewPanel draft={draft} preview={preview} loading={loading} exerciseMap={map} />
    </div>
  );
}
