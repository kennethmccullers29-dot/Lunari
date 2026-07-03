"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDnd } from "@/components/notifications/dnd-context";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  onClick?: () => void;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const { isDnd } = useDnd();
  const isDndRef = useRef(isDnd);
  useEffect(() => { isDndRef.current = isDnd; }, [isDnd]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      if (isDndRef.current) return;
      const id = String(idRef.current++);
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-80">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              t.onClick?.();
              dismiss(t.id);
            }}
            className={cn(
              "pointer-events-auto animate-in slide-in-from-bottom-2 fade-in",
              "rounded-lg bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md",
              "p-3 text-left"
            )}
          >
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
            )}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
