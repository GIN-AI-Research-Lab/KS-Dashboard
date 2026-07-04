"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, Info, X, type LucideIcon } from "lucide-react";

type Variant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: Variant };
type ToastApi = { toast: (message: string, variant?: Variant) => void };

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const VARIANTS: Record<Variant, { Icon: LucideIcon; color: string }> = {
  success: { Icon: Check, color: "var(--status-good)" },
  error: { Icon: CircleAlert, color: "var(--status-critical)" },
  info: { Icon: Info, color: "var(--accent)" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: Variant = "success") => {
      const id = (idRef.current += 1);
      setToasts((list) => [...list, { id, message, variant }]);
      setTimeout(() => remove(id), 3200);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const { Icon, color } = VARIANTS[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className="toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2.5 shadow-[var(--shadow-md)]"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 text-sm leading-snug text-[var(--text-primary)]">{t.message}</div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Đóng"
                className="mt-0.5 shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
