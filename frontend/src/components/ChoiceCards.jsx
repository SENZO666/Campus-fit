import { Check } from "lucide-react";
import { FieldError } from "@/components/FormField";
import { cn } from "@/lib/utils";

const COLS = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-3" };

export function ChoiceCards({ name, legend, options, value, onChange, error, columns = 1, testid }) {
  const errorId = `${name}-error`;
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className={cn("grid gap-3", COLS[columns])}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              data-testid={`${testid}-option-${o.value}`}
              className={cn(
                "group relative flex cursor-pointer items-start gap-4 rounded-xl border-2 bg-white p-5 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-600",
                selected ? "border-slate-900 bg-slate-50" : "border-slate-300 hover:border-slate-500"
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
                  selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-400 bg-white"
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold text-slate-900">{o.label}</span>
                {o.description && <span className="mt-1 block text-sm text-slate-600">{o.description}</span>}
              </span>
              {selected && <span className="sr-only">(selected)</span>}
            </label>
          );
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </fieldset>
  );
}
