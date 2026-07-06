import type { Locale } from "@/i18n/config";

// Inline SVG flags. Emoji flags (🇻🇳) don't render as flags on Windows (they show
// the 2-letter code instead), so we draw them ourselves. All three use the same
// 3:2 viewBox so they render at an identical size; no outer border/ring.
export function Flag({ code, className = "h-4 w-6" }: { code: Locale; className?: string }) {
  const cls = `${className} inline-block shrink-0 overflow-hidden rounded-[2px]`;

  if (code === "vi") {
    return (
      <svg className={cls} viewBox="0 0 30 20" aria-hidden>
        <rect width="30" height="20" fill="#DA251D" />
        <polygon
          points="15,4 16.76,9.42 22.46,9.42 17.85,12.76 19.61,18.18 15,14.84 10.39,18.18 12.15,12.76 7.54,9.42 13.24,9.42"
          fill="#FFFF00"
        />
      </svg>
    );
  }

  if (code === "ja") {
    return (
      <svg className={cls} viewBox="0 0 30 20" aria-hidden>
        <rect width="30" height="20" fill="#fff" />
        <circle cx="15" cy="10" r="6" fill="#BC002D" />
      </svg>
    );
  }

  // en -> Union Jack, drawn in a 3:2 box (simplified: centered red diagonals)
  return (
    <svg className={cls} viewBox="0 0 30 20" aria-hidden>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="2.5" />
      <rect x="12" width="6" height="20" fill="#fff" />
      <rect y="7" width="30" height="6" fill="#fff" />
      <rect x="13" width="4" height="20" fill="#C8102E" />
      <rect y="8" width="30" height="4" fill="#C8102E" />
    </svg>
  );
}
