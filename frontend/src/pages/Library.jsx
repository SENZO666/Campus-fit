import { useState } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseDetailDialog } from "@/components/ExerciseDetailDialog";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { useExercises } from "@/hooks/queries";
import { DIFFICULTY, EQUIPMENT_TIER, MUSCLE_GROUPS } from "@/lib/constants";

function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="mt-2 h-11 rounded-lg border-slate-400 bg-white" data-testid={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {Object.entries(options).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExerciseCard({ exercise, onOpen }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg" data-testid={`library-card-${exercise.id}`}>
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={exercise.image} alt={exercise.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{MUSCLE_GROUPS[exercise.group]}</Badge>
          <Badge variant="outline">{DIFFICULTY[exercise.difficulty]}</Badge>
          {exercise.quiet && <Badge variant="outline">Quiet</Badge>}
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold text-slate-900">{exercise.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{exercise.equipment_label}</p>
        <Button variant="outline" className="mt-5 self-start" onClick={() => onOpen(exercise)} data-testid={`library-view-${exercise.id}`}>
          View steps<span className="sr-only"> for {exercise.name}</span>
        </Button>
      </div>
    </article>
  );
}

export default function Library() {
  const { list, isLoading } = useExercises();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [equipment, setEquipment] = useState("all");
  const [level, setLevel] = useState("all");
  const [open, setOpen] = useState(null);

  const q = query.trim().toLowerCase();
  const results = list.filter((e) =>
    (!q || e.name.toLowerCase().includes(q)) && (group === "all" || e.group === group)
    && (equipment === "all" || e.equipment === equipment) && (level === "all" || e.difficulty === level));
  const active = q || group !== "all" || equipment !== "all" || level !== "all";
  const clear = () => { setQuery(""); setGroup("all"); setEquipment("all"); setLevel("all"); };

  return (
    <div>
      <PageHeader eyebrow="Exercise library" title="Every move, step by step" testid="library-title"
        description="Browse by muscle group, equipment or difficulty. Photos and steps are labelled sample content." />
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Label htmlFor="library-search" className="text-sm font-semibold">Search</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <Input id="library-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. squat"
              className="h-11 rounded-lg border-slate-400 bg-white pl-9" data-testid="library-search-input" />
          </div>
        </div>
        <FilterSelect id="library-filter-group" label="Muscle group" value={group} onChange={setGroup} options={MUSCLE_GROUPS} />
        <FilterSelect id="library-filter-equipment" label="Equipment" value={equipment} onChange={setEquipment} options={EQUIPMENT_TIER} />
        <FilterSelect id="library-filter-difficulty" label="Difficulty" value={level} onChange={setLevel} options={DIFFICULTY} />
      </div>
      <div className="mt-6 flex min-h-10 items-center justify-between">
        <p aria-live="polite" className="text-sm font-medium text-slate-700" data-testid="library-result-count">
          {results.length} {results.length === 1 ? "exercise" : "exercises"}
        </p>
        {active && <Button variant="ghost" onClick={clear} data-testid="library-clear-filters"><X aria-hidden="true" />Clear filters</Button>}
      </div>
      {isLoading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
      ) : results.length ? (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((e) => <li key={e.id}><ExerciseCard exercise={e} onOpen={setOpen} /></li>)}
        </ul>
      ) : (
        <EmptyState icon={Search} title="No exercises match" testid="library-empty"
          action={<Button variant="outline" onClick={clear}>Clear filters</Button>}>
          Try a different muscle group or difficulty.
        </EmptyState>
      )}
      <ExerciseDetailDialog exercise={open} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
