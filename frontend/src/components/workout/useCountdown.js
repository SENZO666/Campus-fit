import { useEffect, useRef, useState } from "react";

export function useCountdown(initial, running, onDone) {
  const [left, setLeft] = useState(initial);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!running) return undefined;
    if (left <= 0) {
      done.current();
      return undefined;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  return [left, setLeft];
}
