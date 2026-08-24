import { cn, initials } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

/**
 * Initials avatar with an optional image. Plain <img> rather than next/image:
 * avatar URLs come from arbitrary hosts, which next/image would need
 * whitelisted in next.config.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // With no name there is nothing to announce, so the avatar is left
  // decorative rather than labelled with an untranslatable placeholder.
  const label = name?.trim() || null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-brand-soft font-semibold text-brand select-none",
        SIZES[size],
        className,
      )}
      title={label ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(label)}</span>
      )}
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
