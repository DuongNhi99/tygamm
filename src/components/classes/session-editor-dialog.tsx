"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveSessionAction } from "@/app/(dashboard)/classes/[classId]/actions";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";
import type { Attendance, LessonSessionRow } from "@/types/database";
import type { Period } from "@/lib/utils";

const ATTENDANCE_OPTIONS: Attendance[] = ["PRESENT", "ABSENT", "MAKEUP"];

/** Edits one cell of the score grid: score, attendance, note and homework (§21). */
export function SessionEditorDialog({
  open,
  onClose,
  classId,
  period,
  studentId,
  studentName,
  sessionNumber,
  session,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  period: Period;
  studentId: string;
  studentName: string;
  sessionNumber: number;
  session?: LessonSessionRow;
}) {
  const router = useRouter();
  const dict = useDict();
  const [state, formAction, isPending] = useActionState(
    saveSessionAction.bind(null, classId),
    null,
  );

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success(dict.classes.sessions.savedShort, { icon: <Check className="h-4 w-4" /> });
      onClose();
      router.refresh();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={interpolate(dict.classes.sessions.session, { number: sessionNumber })}
      description={studentName}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" form="session-form" loading={isPending}>
            {dict.common.save}
          </Button>
        </>
      }
    >
      {/*
        `key` remounts the form when the target cell changes, so defaultValue
        picks up the new session instead of keeping the previous cell's data.
      */}
      <form
        id="session-form"
        key={`${studentId}-${sessionNumber}`}
        action={formAction}
        className="space-y-4"
        noValidate
      >
        <input type="hidden" name="student_id" value={studentId} />
        <input type="hidden" name="period_year" value={period.year} />
        <input type="hidden" name="period_month" value={period.month} />
        <input type="hidden" name="session_number" value={sessionNumber} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={dict.classes.sessions.editorScore}
            htmlFor="score"
            error={fieldErrors.score}
            hint={dict.classes.sessions.editorScoreHint}
          >
            <Input
              id="score"
              name="score"
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0}
              max={10}
              defaultValue={session?.score ?? ""}
              placeholder="8.5"
              aria-invalid={Boolean(fieldErrors.score)}
            />
          </Field>

          <Field label={dict.classes.sessions.lessonDate} htmlFor="lesson_date" error={fieldErrors.lesson_date}>
            <Input
              id="lesson_date"
              name="lesson_date"
              type="date"
              defaultValue={session?.lesson_date ?? ""}
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">{dict.common.attendance}</legend>
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand"
              >
                <input
                  type="radio"
                  name="attendance"
                  value={option}
                  defaultChecked={session?.attendance === option}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {dict.attendance[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={dict.classes.sessions.teacherNote} htmlFor="teacher_note" error={fieldErrors.teacher_note}>
          <Textarea
            id="teacher_note"
            name="teacher_note"
            rows={3}
            defaultValue={session?.teacher_note ?? ""}
            placeholder={dict.classes.sessions.teacherNotePlaceholder}
          />
        </Field>

        <Field label={dict.classes.sessions.homework} htmlFor="homework" error={fieldErrors.homework}>
          <Textarea
            id="homework"
            name="homework"
            rows={3}
            defaultValue={session?.homework ?? ""}
            placeholder={dict.classes.sessions.homeworkPlaceholder}
          />
        </Field>
      </form>
    </Dialog>
  );
}
