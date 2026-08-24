import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/translate";

/**
 * Database errors never reach the user verbatim (§38). The triggers and RPCs
 * in the migrations raise stable, greppable codes; this maps them to
 * sentences a teacher can act on, in their own language. Anything
 * unrecognised becomes a generic message, with the original logged
 * server-side for us.
 *
 * The codes are the contract — they stay English and are never translated,
 * because they are what the database actually raises.
 */
type ErrorCode = keyof Dictionary["errors"];

const CODES: ErrorCode[] = [
  "CLASS_FULL",
  "CLASS_NOT_ACTIVE",
  "CLASS_NOT_FOUND",
  "ALREADY_A_MEMBER",
  "NOT_A_STUDENT",
  "NOT_A_CLASS_MEMBER",
  "ONLY_STUDENTS_CAN_JOIN",
  "NOT_AUTHENTICATED",
  "SESSION_NUMBER_OUT_OF_RANGE",
  "CAPACITY_BELOW_ROSTER",
  "FORBIDDEN_ROLE_CHANGE",
  "FORBIDDEN",
];

/** Postgres constraint names / SQLSTATEs that need their own wording. */
const CONSTRAINT_MESSAGES: Array<[RegExp, ErrorCode]> = [
  [/classes_code_key/i, "codeTaken"],
  [/class_members_class_id_student_id_key/i, "ALREADY_A_MEMBER"],
  [/lesson_sessions_class_id_student_id_period/i, "sessionRecorded"],
  [/profiles_email_key/i, "emailTaken"],
  [/lesson_sessions_score_check/i, "scoreRange"],
  [/row-level security/i, "FORBIDDEN"],
];

function rawMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

/**
 * Async now, because the wording depends on the reader's locale and the
 * dictionary is loaded per request. Every caller already sits inside an
 * async Server Action, so `return actionError(e)` still type-checks without
 * an `await` — an async function accepts a promise as its return value.
 */
export async function friendlyError(error: unknown): Promise<string> {
  const dict = await getDictionary();
  const raw = rawMessage(error);

  if (!raw) return dict.errors.generic;

  for (const code of CODES) {
    if (raw.includes(code)) return dict.errors[code];
  }

  for (const [pattern, key] of CONSTRAINT_MESSAGES) {
    if (pattern.test(raw)) return dict.errors[key];
  }

  // Unknown failure: keep the detail in the server log, not on the screen.
  console.error("[tygamm] unhandled error:", raw);
  return dict.errors.generic;
}

/** Uniform shape returned by every Server Action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionOk(): ActionResult<void>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export async function actionError(
  error: unknown,
  fieldErrors?: Record<string, string>,
): Promise<ActionResult<never>> {
  return { ok: false, error: await friendlyError(error), fieldErrors };
}

/**
 * Validation failures, where the message is already written for the user.
 *
 * Distinct from actionError, which runs its argument through friendlyError()
 * to translate a raised database code. A sentence like "Please check the form"
 * matches no code, so routing it through there would log it as an unhandled
 * error and replace it with the generic message — the opposite of what was
 * wanted. Callers pass an already-translated string from the dictionary.
 */
export function validationError(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error: message, fieldErrors };
}
