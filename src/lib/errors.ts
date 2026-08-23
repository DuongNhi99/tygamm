/**
 * Database errors never reach the user verbatim (§38). The triggers and RPCs
 * in the migrations raise stable, greppable codes; this maps them to
 * sentences a teacher can act on. Anything unrecognised becomes a generic
 * message, with the original logged server-side for us.
 */

const MESSAGES: Record<string, string> = {
  CLASS_FULL: "This class is already full. Increase its capacity or pick another class.",
  CLASS_NOT_ACTIVE: "This class is not active, so it cannot take new students.",
  CLASS_NOT_FOUND: "We could not find that class.",
  ALREADY_A_MEMBER: "This student is already in the class.",
  NOT_A_STUDENT: "Only student accounts can be added to a class.",
  NOT_A_CLASS_MEMBER: "That student is not in this class.",
  ONLY_STUDENTS_CAN_JOIN: "Only student accounts can join a class with an invite link.",
  NOT_AUTHENTICATED: "Please sign in to continue.",
  SESSION_NUMBER_OUT_OF_RANGE: "That session number is outside this class's monthly lessons.",
  CAPACITY_BELOW_ROSTER: "Capacity cannot be lower than the number of students already enrolled.",
  FORBIDDEN_ROLE_CHANGE: "You do not have permission to change roles.",
  FORBIDDEN: "You do not have permission to do that.",
};

/** Postgres constraint names / SQLSTATEs that need their own wording. */
const CONSTRAINT_MESSAGES: Array<[RegExp, string]> = [
  [/classes_code_key/i, "That class code is already in use. Generate a new one."],
  [/class_members_class_id_student_id_key/i, "This student is already in the class."],
  [/lesson_sessions_class_id_student_id_period/i, "That session has already been recorded."],
  [/profiles_email_key/i, "An account with that email already exists."],
  [/lesson_sessions_score_check/i, "Score must be between 0 and 10."],
  [/row-level security/i, "You do not have permission to do that."],
];

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function friendlyError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "";

  if (!raw) return GENERIC_ERROR;

  for (const [code, message] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return message;
  }

  for (const [pattern, message] of CONSTRAINT_MESSAGES) {
    if (pattern.test(raw)) return message;
  }

  // Unknown failure: keep the detail in the server log, not on the screen.
  console.error("[abbaguitar] unhandled error:", raw);
  return GENERIC_ERROR;
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

export function actionError(
  error: unknown,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error: friendlyError(error), fieldErrors };
}

/**
 * Validation failures, where the message is already written for the user.
 *
 * Distinct from actionError, which runs its argument through friendlyError()
 * to translate a raised database code. A sentence like "Please check the form"
 * matches no code, so routing it through there would log it as an unhandled
 * error and replace it with GENERIC_ERROR — the opposite of what was wanted.
 */
export function validationError(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error: message, fieldErrors };
}
