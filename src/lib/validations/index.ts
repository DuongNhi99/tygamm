import type { Dictionary } from "@/lib/i18n/translate";
import { z } from "zod";

/* ---------------------------------------------------------------------
 * Shared field builders
 * ------------------------------------------------------------------- */

/** HTML forms send "" for empty fields; the database wants null. */
const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const optionalText = (max = 500) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().default(null));

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "fullNameMin")
  .max(120, "fullNameMax");

export const emailSchema = z.email("emailInvalid").trim().toLowerCase();

export const phoneSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{8,20}$/, "phoneInvalid")
    .nullable()
    .default(null),
);

export const passwordSchema = z
  .string()
  .min(8, "passwordMin")
  .max(72, "passwordMax");

/* ---------------------------------------------------------------------
 * Authentication
 * ------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "passwordRequired"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/* ---------------------------------------------------------------------
 * People
 * ------------------------------------------------------------------- */

/** A user editing their own profile. Role and status are deliberately absent. */
export const profileSchema = z.object({
  full_name: fullNameSchema,
  phone: phoneSchema,
  avatar_url: z.preprocess(
    emptyToNull,
    z.url("avatarUrlInvalid").nullable().default(null),
  ),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Admin creating a teacher or student account. */
export const createUserSchema = z.object({
  full_name: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(["TEACHER", "STUDENT"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.uuid(),
  full_name: fullNameSchema,
  phone: phoneSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/* ---------------------------------------------------------------------
 * Classes
 * ------------------------------------------------------------------- */

export const classSchema = z
  .object({
    name: z.string().trim().min(2, "classNameMin").max(120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{2,6}$/, "classCodeFormat"),
    class_type: z.enum(["ONE_TO_ONE", "ONE_TO_TWO", "GROUP"]),
    max_students: z.coerce
      .number()
      .int("maxStudentsInt")
      .min(1, "maxStudentsMin")
      .max(100, "maxStudentsMax"),
    teacher_id: z.preprocess(emptyToNull, z.uuid("selectTeacher").nullable().default(null)),
    sessions_per_month: z.coerce
      .number()
      .int("sessionsInt")
      .min(1, "sessionsMin")
      .max(31, "sessionsMax"),
    start_date: z.preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "startDateInvalid")
        .nullable()
        .default(null),
    ),
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  })
  // Capacity is fixed by the class type for the two non-group shapes; the
  // database normalises it too, this just keeps the form honest.
  .transform((data) => ({
    ...data,
    max_students:
      data.class_type === "ONE_TO_ONE"
        ? 1
        : data.class_type === "ONE_TO_TWO"
          ? 2
          : data.max_students,
  }));
export type ClassInput = z.infer<typeof classSchema>;

export const classIdSchema = z.object({ classId: z.uuid() });

/* ---------------------------------------------------------------------
 * Membership
 * ------------------------------------------------------------------- */

export const addMemberSchema = z.object({
  class_id: z.uuid(),
  student_id: z.uuid("selectStudent"),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const studentSearchSchema = z.object({
  query: z.string().trim().min(3, "minThreeCharacters"),
});

export const joinClassSchema = z.object({
  code: z.string().trim().min(3, "enterValidCode").toUpperCase(),
});

/* ---------------------------------------------------------------------
 * Lesson sessions
 * ------------------------------------------------------------------- */

/** 0-10 with decimals, or null for "not graded yet". */
export const scoreSchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "string") return Number(value.replace(",", "."));
    return value;
  },
  z
    .number("scoreNumber")
    .min(0, "scoreRange")
    .max(10, "scoreRange")
    .nullable(),
);

export const attendanceSchema = z.preprocess(
  emptyToNull,
  z.enum(["PRESENT", "ABSENT", "MAKEUP"]).nullable().default(null),
);

export const sessionEntrySchema = z.object({
  class_id: z.uuid(),
  student_id: z.uuid(),
  period_year: z.coerce.number().int().min(2000).max(2100),
  period_month: z.coerce.number().int().min(1).max(12),
  session_number: z.coerce.number().int().min(1, "sessionNumberMin").max(31),
  lesson_date: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "lessonDateInvalid")
      .nullable()
      .default(null),
  ),
  score: scoreSchema,
  attendance: attendanceSchema,
  teacher_note: optionalText(2000),
  homework: optionalText(2000),
});
export type SessionEntryInput = z.infer<typeof sessionEntrySchema>;

/** Mobile score entry saves a whole month for one student in one go. */
export const bulkSessionSchema = z.object({
  class_id: z.uuid(),
  student_id: z.uuid(),
  period_year: z.coerce.number().int().min(2000).max(2100),
  period_month: z.coerce.number().int().min(1).max(12),
  entries: z
    .array(
      z.object({
        session_number: z.coerce.number().int().min(1).max(31),
        score: scoreSchema,
        attendance: attendanceSchema,
      }),
    )
    .max(31),
});
export type BulkSessionInput = z.infer<typeof bulkSessionSchema>;

/* ---------------------------------------------------------------------
 * Settings
 * ------------------------------------------------------------------- */

export const appSettingsSchema = z.object({
  center_name: z.string().trim().min(2, "centreNameRequired").max(80),
  default_sessions_per_month: z.coerce
    .number()
    .int()
    .min(1, "sessionsMin")
    .max(31, "sessionsMax"),
});
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;

/* ---------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------- */

export type FieldErrors = Record<string, string>;

/**
 * Flattens a ZodError into `{ fieldName: firstMessage }` for form display.
 *
 * The schemas above carry dictionary *keys* rather than sentences, because a
 * schema is a module-level constant and cannot await a per-request
 * dictionary. Resolving them here — the one place every validation failure
 * passes through — keeps the schemas static and still lets a Vietnamese user
 * read a Vietnamese message.
 *
 * A message that is not a known key is passed through unchanged, so an
 * unmapped Zod built-in still says something rather than rendering a key.
 */
export function fieldErrorsFrom(error: z.ZodError, dict: Dictionary): FieldErrors {
  const messages = dict.validation as Record<string, string | undefined>;
  const result: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = messages[issue.message] ?? issue.message;
  }

  return result;
}
