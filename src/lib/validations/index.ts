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
  .min(2, "Full name must be at least 2 characters")
  .max(120, "Full name is too long");

export const emailSchema = z.email("Enter a valid email address").trim().toLowerCase();

export const phoneSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{8,20}$/, "Phone number is invalid")
    .nullable()
    .default(null),
);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

/* ---------------------------------------------------------------------
 * Authentication
 * ------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
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
    message: "Passwords do not match",
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
    z.url("Enter a valid image URL").nullable().default(null),
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
    name: z.string().trim().min(2, "Class name must be at least 2 characters").max(120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{2,6}$/, "Use a code like GT-BG-0826"),
    class_type: z.enum(["ONE_TO_ONE", "ONE_TO_TWO", "GROUP"]),
    max_students: z.coerce
      .number()
      .int("Maximum students must be a whole number")
      .min(1, "A class needs at least 1 student")
      .max(100, "Maximum 100 students per class"),
    teacher_id: z.preprocess(emptyToNull, z.uuid("Select a teacher").nullable().default(null)),
    sessions_per_month: z.coerce
      .number()
      .int("Lessons per month must be a whole number")
      .min(1, "At least 1 lesson per month")
      .max(31, "At most 31 lessons per month"),
    start_date: z.preprocess(
      emptyToNull,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid start date")
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
  student_id: z.uuid("Select a student"),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const studentSearchSchema = z.object({
  query: z.string().trim().min(3, "Enter at least 3 characters"),
});

export const joinClassSchema = z.object({
  code: z.string().trim().min(3, "Enter a class code").toUpperCase(),
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
    .number("Score must be a number")
    .min(0, "Score must be between 0 and 10")
    .max(10, "Score must be between 0 and 10")
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
  session_number: z.coerce.number().int().min(1, "Session number must be at least 1").max(31),
  lesson_date: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid lesson date")
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
  center_name: z.string().trim().min(2, "Centre name is required").max(80),
  default_sessions_per_month: z.coerce
    .number()
    .int()
    .min(1, "At least 1 lesson per month")
    .max(31, "At most 31 lessons per month"),
});
export type AppSettingsInput = z.infer<typeof appSettingsSchema>;

/* ---------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------- */

export type FieldErrors = Record<string, string>;

/** Flattens a ZodError into `{ fieldName: firstMessage }` for form display. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
