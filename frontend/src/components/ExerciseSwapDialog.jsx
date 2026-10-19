import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExercises } from "@/hooks/queries";
import { api } from "@/lib/api";
import { DIFFICULTY, MUSCLE_GROUPS } from "@/lib/constants";

function OptionList({ items = [], loading, onPick, empty }) {
  if (loading) return <p className="py-6 text-slate-600">Loading exercises…</p>;
  if (!items.length) return <p className="py-6 text-slate-600">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-200">
      {items.map((e) => (
        <li key={e.id} className="flex items-center gap-4 py-3">
          <img src={e.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{e.name}</p>
            <p className="text-sm text-slate-600">
              {MUSCLE_GROUPS[e.group]} · {e.equipment_label} · {DIFFICULTY[e.difficulty]}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onPick(e)} data-testid={`swap-choose-${e.id}`}>
            Choose<span className="sr-only"> {e.name}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function ExerciseSwapDialog({ open, onOpenChange, exerciseId, onPick }) {
  const { map } = useExercises();
  const [query, setQuery] = useState("");
  const current = map[exerciseId];
  const alts = useQuery({
    queryKey: ["alternatives", exerciseId],
    queryFn: () => api.get(`/exercises/${exerciseId}/alternatives`).then((r) => r.data),
    enabled: open && !!exerciseId,
  });
  const all = useQuery({
    queryKey: ["suitable"],
    queryFn: () => api.get("/exercises/suitable").then((r) => r.data),
    enabled: open,
  });
  const filtered = (all.data || []).filter(
    (e) => e.id !== exerciseId && e.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const pick = (e) => {
    onPick(e.suggested_item, e);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl" data-testid="swap-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Swap {current?.name}</DialogTitle>
          <DialogDescription className="text-base text-slate-600">
            Pick a similar exercise, or browse everything that suits your equipment and space.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="similar">
          <TabsList className="h-11">
            <TabsTrigger value="similar" className="h-9 px-4" data-testid="swap-tab-similar">Similar exercises</TabsTrigger>
            <TabsTrigger value="library" className="h-9 px-4" data-testid="swap-tab-library">Browse the library</TabsTrigger>
          </TabsList>
          <TabsContent value="similar">
            <OptionList items={alts.data} loading={alts.isLoading} onPick={pick}
              empty="No similar exercises fit your setup. Try the library tab." />
          </TabsContent>
          <TabsContent value="library">
            <Label htmlFor="swap-search" className="mt-2 block text-sm font-semibold">Search exercises</Label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <Input id="swap-search" value={query} onChange={(e) => setQuery(e.target.value)}
                className="h-11 rounded-lg border-slate-400 pl-9" data-testid="swap-search-input" />
            </div>
            <OptionList items={filtered} loading={all.isLoading} onPick={pick} empty="No exercises match that search." />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
