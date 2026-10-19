import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <p id={id} data-testid={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function TextField({ id, label, hint, error, testid, className, inputClassName, ...props }) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-sm font-semibold text-slate-900">{label}</Label>
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm text-slate-600">{hint}</p>}
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-testid={testid}
        className={cn("mt-2 h-12 rounded-lg border-slate-400 bg-white text-base", error && "border-red-700", inputClassName)}
        {...props}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
