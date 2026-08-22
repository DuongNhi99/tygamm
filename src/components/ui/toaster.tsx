"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast host, mounted once in the root layout. Colours come from the same
 * CSS variables as everything else, so toasts follow the theme.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "0.75rem",
        },
        classNames: {
          success: "!text-success",
          error: "!text-danger",
        },
      }}
    />
  );
}
