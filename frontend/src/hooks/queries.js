import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { todayISO } from "@/lib/dates";

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export function useExercises() {
  const query = useQuery({ queryKey: ["exercises"], queryFn: () => get("/exercises"), staleTime: Infinity });
  const map = useMemo(() => Object.fromEntries((query.data || []).map((e) => [e.id, e])), [query.data]);
  return { ...query, list: query.data || [], map };
}

export const useWeek = (weekStart) =>
  useQuery({ queryKey: ["week", weekStart], queryFn: () => get(`/weeks/${weekStart}`), staleTime: 0 });

export const useProgress = () =>
  useQuery({ queryKey: ["progress"], queryFn: () => get("/progress", { today: todayISO() }), staleTime: 0 });

export const usePeers = () => useQuery({ queryKey: ["peers"], queryFn: () => get("/peers"), staleTime: 0 });
export const useFeed = () => useQuery({ queryKey: ["feed"], queryFn: () => get("/feed"), staleTime: 0 });
export const useChallenges = () => useQuery({ queryKey: ["challenges"], queryFn: () => get("/challenges"), staleTime: 0 });
export const useHidden = () => useQuery({ queryKey: ["hidden"], queryFn: () => get("/me/hidden"), staleTime: 0 });
