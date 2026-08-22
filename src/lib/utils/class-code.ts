/**
 * Class codes look like `GT-BG-0826`:
 *
 *   GT    fixed prefix (guitar centre)
 *   BG    two letters derived from the class name ("Guitar Beginner")
 *   0826  the month the class starts, MMYY
 *
 * The code is a human-facing invite token, so it stays short and readable.
 * Uniqueness is enforced by a unique index in migration 002; the service
 * layer retries with `nextCodeVariant` when a generated code is taken.
 */

const PREFIX = "GT";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — invite codes get read aloud

export const CLASS_CODE_PATTERN = /^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{2,6}$/;

function lettersFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // Prefer initials of the last two words: "Guitar Beginner" -> "GB".
  // Real rosters have many "Guitar X" classes, so the distinguishing word
  // is almost always the tail, not the head.
  if (words.length >= 2) {
    const tail = words.slice(-2);
    return (tail[0][0] + tail[1][0]).slice(0, 2);
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).padEnd(2, "X");
  }

  return "CL";
}

function monthYear(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
}

function randomChars(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Base code for a class, e.g. `generateClassCode("Guitar Beginner")` -> `GT-GB-0826`. */
export function generateClassCode(name: string, startDate?: Date | string | null): string {
  const date = startDate ? new Date(startDate) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${PREFIX}-${lettersFromName(name)}-${monthYear(safeDate)}`;
}

/**
 * Collision fallback. Attempt 1 returns the base code untouched so the
 * common case stays tidy; later attempts append random characters.
 */
export function nextCodeVariant(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  return `${base}${randomChars(attempt <= 3 ? 1 : 2)}`;
}

export function isValidClassCode(code: string): boolean {
  return CLASS_CODE_PATTERN.test(code.trim().toUpperCase());
}

export function normalizeClassCode(code: string): string {
  return code.trim().toUpperCase();
}
