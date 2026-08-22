"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Small menu used for row actions and the user menu. Closes on outside
 * click, on Esc, and returns focus to the trigger — the three things a
 * hand-rolled dropdown usually gets wrong.
 */
export function Dropdown({
  trigger,
  children,
  align = "end",
  label = "Open menu",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center rounded-xl text-ink-muted transition-colors hover:text-ink"
      >
        {trigger}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-40 mt-2 min-w-48 overflow-hidden rounded-xl border border-line bg-card p-1 shadow-md",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  className,
  destructive,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        destructive ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-line" role="separator" />;
}
