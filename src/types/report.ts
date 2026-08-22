export interface ReportFilters {
  year: number;
  month: number;
  teacherId?: string;
  classId?: string;
  studentId?: string;
}

export interface ClassReportRow {
  class_id: string;
  class_name: string;
  class_code: string;
  teacher_name: string | null;
  student_count: number;
  lessons_recorded: number;
  average_score: number | null;
  attendance_rate: number | null;
}

export interface ReportTotals {
  classes: number;
  students: number;
  lessons: number;
  average_score: number | null;
  attendance_rate: number | null;
}
