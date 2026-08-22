/**
 * Hand-maintained mirror of `supabase/migrations`. Keep in sync when the
 * schema changes, or regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type Role = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type ClassType = "ONE_TO_ONE" | "ONE_TO_TWO" | "GROUP";
export type ClassStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type MemberStatus = "ACTIVE" | "INACTIVE";
export type Attendance = "PRESENT" | "ABSENT" | "MAKEUP";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type ClassRow = {
  id: string;
  name: string;
  code: string;
  class_type: ClassType;
  max_students: number;
  teacher_id: string | null;
  sessions_per_month: number;
  start_date: string | null;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export type ClassMemberRow = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
  status: MemberStatus;
}

export type LessonSessionRow = {
  id: string;
  class_id: string;
  student_id: string;
  period_year: number;
  period_month: number;
  session_number: number;
  lesson_date: string | null;
  score: number | null;
  attendance: Attendance | null;
  teacher_note: string | null;
  homework: string | null;
  created_at: string;
  updated_at: string;
}

export type MonthlyProgressRow = {
  id: string;
  class_id: string;
  student_id: string;
  year: number;
  month: number;
  average_score: number | null;
  attendance_rate: number | null;
  lessons_completed: number;
  created_at: string;
  updated_at: string;
}

export type AppSettingsRow = {
  id: number;
  center_name: string;
  default_sessions_per_month: number;
  updated_at: string;
}

/** Return shape of the `get_class_by_code` RPC (migration 007). */
export type ClassByCodeRow = {
  id: string;
  name: string;
  code: string;
  class_type: ClassType;
  status: ClassStatus;
  sessions_per_month: number;
  max_students: number;
  member_count: number;
  teacher_name: string | null;
  is_member: boolean;
}

/** Return shape of the `find_student_by_contact` RPC (migration 007). */
export type StudentSearchRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: UserStatus;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/**
 * Insert shape: `Required` are the columns with no default and no NULL
 * allowed; everything else is optional because Postgres fills it in.
 * Naming a column you do not mean to set is how an UPSERT quietly nulls it.
 */
type Insertable<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, Required>>;

/**
 * `Empty` must be `{ [_ in never]: never }`, not `Record<string, never>`.
 * The latter claims *every* string key exists, so PostgREST's table lookup
 * resolves "classes" against Views before Tables and every write collapses
 * to `never`. This is the shape Supabase's own codegen emits.
 */
type Empty = { [_ in never]: never };

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, Insertable<ProfileRow, "id">, Partial<ProfileRow>>;
      classes: TableDef<
        ClassRow,
        Insertable<ClassRow, "name" | "code" | "class_type">,
        Partial<ClassRow>
      >;
      class_members: TableDef<
        ClassMemberRow,
        Insertable<ClassMemberRow, "class_id" | "student_id">,
        Partial<ClassMemberRow>
      >;
      lesson_sessions: TableDef<
        LessonSessionRow,
        Insertable<
          LessonSessionRow,
          "class_id" | "student_id" | "period_year" | "period_month" | "session_number"
        >,
        Partial<LessonSessionRow>
      >;
      // Written only by the trigger in migration 005 — there is no policy
      // that lets application code insert or update it.
      monthly_progress: TableDef<MonthlyProgressRow, Partial<MonthlyProgressRow>, Partial<MonthlyProgressRow>>;
      app_settings: TableDef<AppSettingsRow, Partial<AppSettingsRow>, Partial<AppSettingsRow>>;
    };
    Views: Empty;
    Functions: {
      get_class_by_code: {
        Args: { p_code: string };
        Returns: ClassByCodeRow[];
      };
      join_class: {
        Args: { p_code: string };
        Returns: string;
      };
      find_student_by_contact: {
        Args: { p_query: string };
        Returns: StudentSearchRow[];
      };
    };
    Enums: Empty;
    CompositeTypes: Empty;
  };
}
