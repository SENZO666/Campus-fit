import { Minus, Plus, Repeat, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATES } from "@/lib/constants";
import { formatShort } from "@/lib/dates";
import { plural, prescription, restLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function ReplaceMenu({ number, disabled, onReplace }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} data-testid={`plan-session-replace-${number}`}>
          <Shuffle aria-hidden="true" />Replace session
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Replace with</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TEMPLATES.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => onReplace(t.id)} data-testid={`replace-option-${t.id}`} className="flex-col items-start gap-0.5">
            <span className="font-semibold">{t.title}</span>
            <span className="text-xs text-slate-600">{t.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LengthControl({ id, number, value, busy, onResize }) {
  return (
    <div>
      <span id={`len-${id}`} className="text-sm font-medium text-slate-900">Length</span>
      <div className="mt-2 flex items-center gap-2" role="group" aria-labelledby={`len-${id}`}>
        <Button size="icon" variant="outline" disabled={busy || value <= 10} onClick={() => onResize(-5)}
          aria-label="Make this session 5 minutes shorter" data-testid={`plan-session-shorter-${number}`}>
          <Minus />
        </Button>
        <span className="w-16 text-center font-mono font-semibold" data-testid={`plan-session-length-${number}`}>{value} min</span>
        <Button size="icon" variant="outline" disabled={busy || value >= 60} onClick={() => onResize(5)}
          aria-label="Make this session 5 minutes longer" data-testid={`plan-session-longer-${number}`}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function SessionEditor({ session, number, dayOptions, busy, exerciseMap, onChange, onResize, onReplace, onSwap, onRemove }) {
  const id = session.key;
  return (
    <article aria-labelledby={`session-title-${id}`} aria-busy={busy} data-testid={`plan-session-card-${number}`}
      className={cn("h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-[box-shadow,opacity] duration-200 hover:shadow-md sm:p-7", busy && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-label text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Session {number}</p>
          <h3 id={`session-title-${id}`} className="mt-1 font-display text-2xl font-semibold text-slate-900" data-testid={`plan-session-title-${number}`}>
            {session.title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{plural(session.items.length, "exercise")}</p>
        </div>
        <ReplaceMenu number={number} disabled={busy} onReplace={onReplace} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`day-${id}`} className="text-sm font-medium">Day</Label>
          <Select value={session.date} onValueChange={(v) => onChange({ date: v })}>
            <SelectTrigger id={`day-${id}`} data-testid={`plan-session-day-${number}`} className="mt-2 h-11 rounded-lg border-slate-400 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((d) => <SelectItem key={d} value={d} data-testid={`plan-day-option-${d}`}>{formatShort(d)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`time-${id}`} className="text-sm font-medium">Start time</Label>
          <Input id={`time-${id}`} type="time" value={session.time} onChange={(e) => onChange({ time: e.target.value })}
            data-testid={`plan-session-time-${number}`} className="mt-2 h-11 rounded-lg border-slate-400 bg-white font-mono" />
        </div>
        <LengthControl id={id} number={number} value={session.duration_min} busy={busy} onResize={onResize} />
      </div>
      <ol className="mt-6 divide-y divide-slate-100 border-t border-slate-100" aria-label={`Exercises in ${session.title}`}>
        {session.items.map((item, i) => {
          const ex = exerciseMap[item.exercise_id];
          return (
            <li key={`${item.exercise_id}-${i}`} className="flex items-center gap-4 py-3" data-testid={`plan-exercise-${number}-${i}`}>
              {ex && <img src={ex.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{ex?.name || item.exercise_id}</p>
                <p className="font-mono text-xs text-slate-600">{prescription(item)} · {restLabel(item)}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onSwap(i, item.exercise_id)} disabled={busy} data-testid={`plan-swap-button-${number}-${i}`}>
                <Repeat aria-hidden="true" />Swap<span className="sr-only"> {ex?.name}</span>
              </Button>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy} data-testid={`plan-session-remove-${number}`}>
          <Trash2 aria-hidden="true" />Remove session
        </Button>
      </div>
    </article>
  );
}
