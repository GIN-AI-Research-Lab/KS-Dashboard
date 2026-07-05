"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

// Small "?" info affordance that shows a styled explanation on hover/focus.
// The bubble is portalled to <body> so it is never clipped by a card's
// overflow-hidden, and positioned as `fixed` from the trigger's rect.
export function InfoTip({ label, className }: { label: string; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const id = useId();

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top, left: r.left + r.width / 2 });
  }
  function hide() {
    setPos(null);
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label="Giải thích chỉ số"
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] ${
          className ?? ""
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top - 8,
              left: Math.min(Math.max(pos.left, 130), (typeof window !== "undefined" ? window.innerWidth : 9999) - 130),
              transform: "translate(-50%, -100%)",
            }}
            className="pointer-events-none z-[120] max-w-[240px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-xs font-normal normal-case leading-snug tracking-normal text-[var(--text-secondary)] shadow-[var(--shadow-md)]"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
