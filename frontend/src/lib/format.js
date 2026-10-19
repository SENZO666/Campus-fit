export const prescription = (item) => {
  const work = item.duration_sec ? `${item.duration_sec} s` : `${item.reps} reps`;
  return `${item.sets} × ${work}`;
};

export const restLabel = (item) => `${item.rest_sec} s rest`;

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export const clock = (sec) => {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
