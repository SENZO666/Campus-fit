import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatShort, todayISO } from "@/lib/dates";
import { useAnnounce } from "@/context/Announcer";

export function useSessionActions() {
  const qc = useQueryClient();
  const { announce } = useAnnounce();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["week"] });
    qc.invalidateQueries({ queryKey: ["progress"] });
    qc.invalidateQueries({ queryKey: ["challenges"] });
  }, [qc]);

  const restore = useCallback(async (session, message) => {
    const today = todayISO();
    await api.patch(`/sessions/${session.id}/reschedule`, {
      date: session.date, time: session.time, today: session.date < today ? session.date : today,
    });
    refresh();
    toast(message);
    announce(message);
  }, [refresh, announce]);

  const reschedule = useCallback(async (session, date, time) => {
    const { data } = await api.patch(`/sessions/${session.id}/reschedule`, { date, time, today: todayISO() });
    refresh();
    const message = `${session.title} moved to ${formatShort(date)} at ${time}`;
    announce(message);
    toast.success(message, { action: { label: "Undo", onClick: () => restore(session, "Move undone") } });
    return data;
  }, [refresh, announce, restore]);

  const skip = useCallback(async (session) => {
    await api.post(`/sessions/${session.id}/skip`);
    refresh();
    const message = "Okay. On to your next session.";
    announce(message);
    toast(message, { action: { label: "Undo", onClick: () => restore(session, "Session is back in your week") } });
  }, [refresh, announce, restore]);

  return { reschedule, skip, refresh };
}
