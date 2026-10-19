export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad = (n) => String(n).padStart(2, "0");

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

export const parseISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysISO = (s, n) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const mondayOfISO = (s) => addDaysISO(s, -((parseISO(s).getDay() + 6) % 7));
export const currentWeekStart = () => mondayOfISO(todayISO());
export const dayIndexOf = (s) => (parseISO(s).getDay() + 6) % 7;
export const weekDates = (ws) => Array.from({ length: 7 }, (_, i) => addDaysISO(ws, i));

export const formatShort = (s) =>
  parseISO(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export const formatDayMonth = (s) => parseISO(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const formatLong = (s) =>
  parseISO(s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export const weekLabel = (ws) => `${formatDayMonth(ws)} – ${formatDayMonth(addDaysISO(ws, 6))}`;

export const relativeDay = (s, today = todayISO()) => {
  if (s === today) return "Today";
  if (s === addDaysISO(today, 1)) return "Tomorrow";
  if (s === addDaysISO(today, -1)) return "Yesterday";
  return formatShort(s);
};

export const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

export const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
