import * as React from "react";
import { cn } from "@/lib/utils";

const CONTROL_BASE =
  "w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:border-brand focus:outline-none focus-visible:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-subtle " +
  "aria-[invalid=true]:border-danger";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-sm font-medium text-ink", className)} {...props}>
      {children}
      {required && (
        <span className="text-danger" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_BASE, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL_BASE, "h-11 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-sm text-danger" role="alert">
      {children}
    </p>
  );
}

export function Hint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs text-ink-muted">{children}</p>;
}

/**
 * Label + control + error, wired together by id so screen readers announce
 * the message with the field rather than as loose text.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      <Hint>{hint}</Hint>
      <FieldError>{error}</FieldError>
    </div>
  );
}
