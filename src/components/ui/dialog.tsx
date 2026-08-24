"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/lib/i18n/client";
import { Button } from "./button";

/**
 * Built on the native <dialog> element, which gives us the accessibility
 * work for free and correctly: focus trapping, Esc to dismiss, inert
 * background, and top-layer stacking that no z-index can fight.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const dict = useDict();
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // Keeps state in sync when the browser closes the dialog itself (Esc).
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  // The dialog element fills the top layer, so a click that lands on the
  // element itself (rather than the panel inside it) is a backdrop click.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-0 text-ink shadow-md",
        "backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm",
        size === "sm" && "max-w-sm",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h2 id={titleId} className="text-base font-semibold text-ink">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-ink-muted">
              {description}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={dict.common.close}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {children && <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>}

      {footer && (
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </dialog>
  );
}

/**
 * Confirmation for destructive actions (§50). Never `window.confirm` — it is
 * unstyled, unlabelled and blocks the main thread.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const dict = useDict();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading} className="sm:w-auto">
            {cancelLabel ?? dict.common.cancel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            className="sm:w-auto"
          >
            {confirmLabel ?? dict.common.confirm}
          </Button>
        </>
      }
    />
  );
}
