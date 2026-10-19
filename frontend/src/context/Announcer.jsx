import { createContext, useCallback, useContext, useRef, useState } from "react";

const AnnouncerContext = createContext({ announce: () => {} });

// Screen-reader status messages (e.g. "Plan saved", timer updates)
export function AnnouncerProvider({ children }) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const announce = useCallback((text) => {
    setMessage("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(text), 60);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-announcer">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnouncerContext);
