import { cn } from "@/lib/utils";

/** Wordmark with a guitar glyph. Inline SVG so it inherits the theme colour. */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-ink shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M14.8 3.2a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8l-2 2-6-6 2-2Z"
            fill="currentColor"
            opacity="0.55"
          />
          <path
            d="M12.8 5.2l6 6-4.5 4.5a6.5 6.5 0 1 1-6-6L12.8 5.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="9.5" cy="14.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-ink">Tygamm</span>
      )}
    </span>
  );
}
