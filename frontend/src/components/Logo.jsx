import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ inverted = false, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg",
          inverted ? "bg-emerald-400 text-slate-950" : "bg-slate-900 text-emerald-400"
        )}
      >
        <Activity className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className={cn("whitespace-nowrap font-display text-lg font-bold tracking-tight", inverted ? "text-white" : "text-slate-900")}>
        CampusFit
        {!compact && (
          <span className={cn("hidden font-medium sm:inline", inverted ? "text-slate-300" : "text-slate-600")}> Planner</span>
        )}
      </span>
    </span>
  );
}
