"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const DND_KEY = "lunari-dnd";

type DndContextValue = { isDnd: boolean; toggleDnd: () => void };

const DndCtx = createContext<DndContextValue>({ isDnd: false, toggleDnd: () => {} });

export function useDnd() {
  return useContext(DndCtx);
}

export function DndProvider({ children }: { children: ReactNode }) {
  const [isDnd, setIsDnd] = useState(false);

  useEffect(() => {
    try {
      setIsDnd(localStorage.getItem(DND_KEY) === "true");
    } catch { /* storage unavailable */ }
  }, []);

  const toggleDnd = useCallback(() => {
    setIsDnd((prev) => {
      const next = !prev;
      try { localStorage.setItem(DND_KEY, String(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  return <DndCtx.Provider value={{ isDnd, toggleDnd }}>{children}</DndCtx.Provider>;
}
