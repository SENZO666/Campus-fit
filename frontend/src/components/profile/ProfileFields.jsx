import { Check, Minus, Plus } from "lucide-react";
import { ChoiceCards } from "@/components/ChoiceCards";
import { FieldError } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EQUIPMENT, GOALS, LEVELS, PLACES } from "@/lib/constants";
import { DAY_NAMES, DAY_SHORT } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const PROFILE_STEPS = ["goal", "level", "days", "length", "equipment", "place"];

export const EMPTY_PROFILE = { goal: "", level: "", days: [], session_length: 20, equipment: "", place: "" };

export function validateStep(step, draft) {
  switch (step) {
    case "goal":
      return draft.goal ? {} : { goal: "Choose a goal to continue." };
    case "level":
      return draft.level ? {} : { level: "Choose the level that fits you today." };
    case "days": {
      if (!draft.days.length) return { days: "Choose at least one available day." };
      const missing = draft.days.find((d) => !d.time);
      return missing ? { [`time-${missing.day}`]: `Add a start time for ${DAY_NAMES[missing.day]}.` } : {};
    }
    case "length": {
      const v = Number(draft.session_length);
      return v >= 10 && v <= 60 && v % 5 === 0 ? {} : { length: "Choose a length between 10 and 60 minutes." };
    }
    case "equipment":
      return draft.equipment ? {} : { equipment: "Choose the equipment you can use." };
    case "place":
      return draft.place ? {} : { place: "Choose where you'll usually train." };
    default:
      return {};
  }
}

export const validateProfile = (draft) => PROFILE_STEPS.reduce((acc, s) => ({ ...acc, ...validateStep(s, draft) }), {});

function DaysField({ draft, set, errors }) {
  const selected = new Set(draft.days.map((d) => d.day));
  const toggle = (day) => {
    const days = selected.has(day)
      ? draft.days.filter((d) => d.day !== day)
      : [...draft.days, { day, time: "17:00" }].sort((a, b) => a.day - b.day);
    set({ days });
  };
  const setTime = (day, time) => set({ days: draft.days.map((d) => (d.day === day ? { ...d, time } : d)) });

  return (
    <div className="space-y-8">
      <fieldset aria-describedby={errors.days ? "days-error" : undefined}>
        <legend className="text-sm font-semibold text-slate-900">Available days</legend>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAY_NAMES.map((name, day) => {
            const on = selected.has(day);
            return (
              <label
                key={day}
                data-testid={`day-toggle-${day}`}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-colors",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600",
                  on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
                )}
              >
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(day)} aria-label={name} />
                <span className="font-label text-base font-semibold uppercase tracking-wider" aria-hidden="true">{DAY_SHORT[day]}</span>
                <span className="flex items-center gap-1 text-xs" aria-hidden="true">
                  {on ? <><Check className="h-3 w-3" strokeWidth={3} />Train</> : "Free"}
                </span>
              </label>
            );
          })}
        </div>
        <FieldError id="days-error">{errors.days}</FieldError>
      </fieldset>
      {draft.days.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {draft.days.map((d) => {
            const err = errors[`time-${d.day}`];
            return (
              <div key={d.day}>
                <Label htmlFor={`time-${d.day}`} className="text-sm font-semibold text-slate-900">
                  Start time on {DAY_NAMES[d.day]}
                </Label>
                <Input
                  id={`time-${d.day}`}
                  type="time"
                  value={d.time}
                  onChange={(e) => setTime(d.day, e.target.value)}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? `time-${d.day}-error` : undefined}
                  data-testid={`day-time-${d.day}`}
                  className="mt-2 h-12 rounded-lg border-slate-400 bg-white font-mono text-base"
                />
                <FieldError id={`time-${d.day}-error`}>{err}</FieldError>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LengthField({ draft, set, errors }) {
  const v = Number(draft.session_length);
  const change = (n) => set({ session_length: Math.min(60, Math.max(10, n)) });
  return (
    <div>
      <p className="font-mono text-6xl font-bold tracking-tight text-slate-900" data-testid="length-value">
        {v}<span className="ml-2 text-2xl font-medium text-slate-600">min</span>
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Button type="button" variant="outline" size="icon" onClick={() => change(v - 5)} disabled={v <= 10}
          aria-label="Make sessions 5 minutes shorter" data-testid="length-decrease-button">
          <Minus />
        </Button>
        <Slider min={10} max={60} step={5} value={[v]} onValueChange={([n]) => change(n)}
          thumbLabel="Session length in minutes" aria-valuetext={`${v} minutes`} data-testid="length-slider" className="flex-1" />
        <Button type="button" variant="outline" size="icon" onClick={() => change(v + 5)} disabled={v >= 60}
          aria-label="Make sessions 5 minutes longer" data-testid="length-increase-button">
          <Plus />
        </Button>
      </div>
      <div className="mt-1 flex justify-between px-14 font-mono text-xs text-slate-600" aria-hidden="true">
        <span>10 min</span><span>60 min</span>
      </div>
      <FieldError id="length-error">{errors.length}</FieldError>
    </div>
  );
}

const choice = (name, legend, options, columns = 1) =>
  function ChoiceField({ draft, set, errors }) {
    return (
      <ChoiceCards name={name} legend={legend} options={options} value={draft[name]} columns={columns}
        onChange={(v) => set({ [name]: v })} error={errors[name]} testid={name} />
    );
  };

const FIELDS = {
  goal: choice("goal", "Training goal", GOALS, 2),
  level: choice("level", "Experience level", LEVELS),
  days: DaysField,
  length: LengthField,
  equipment: choice("equipment", "Equipment", EQUIPMENT),
  place: choice("place", "Training place", PLACES),
};

export function ProfileField({ step, ...props }) {
  const Field = FIELDS[step];
  return <Field {...props} />;
}
