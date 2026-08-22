"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { SessionEditorDialog } from "./session-editor-dialog";
import { saveMonthAction } from "@/app/(dashboard)/classes/[classId]/actions";
import { cn, formatPercent, formatScoreCompact, formatScore, scoreTone, type Period } from "@/lib/utils";
import { ATTENDANCE_LABELS } from "@/types/lesson";
import type { Attendance } from "@/types/database";
import type { ScoreGrid as ScoreGridData, ScoreGridRow } from "@/types/lesson";

const ATTENDANCE_OPTIONS: Attendance[] = ["PRESENT", "ABSENT", "MAKEUP"];

const CELL_TONES: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-ink-subtle",
};

export function ScoreGrid({
  grid,
  period,
  canEdit,
}: {
  grid: ScoreGridData;
  period: Period;
  canEdit: boolean;
}) {
  const sessionNumbers = useMemo(
    () => Array.from({ length: grid.sessions_per_month }, (_, i) => i + 1),
    [grid.sessions_per_month],
  );

  const [editing, setEditing] = useState<{ row: ScoreGridRow; sessionNumber: number } | null>(null);

  return (
    <>
      {/* ---------------------------------------------------------- desktop */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-card shadow-sm md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Scores for each student and session. Select a cell to record a score.
          </caption>
          <thead className="bg-muted/60">
            <tr>
              {/* Sticky so the name stays visible while the sessions scroll. */}
              <th
                scope="col"
                className="sticky left-0 z-10 bg-muted px-4 py-3 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase"
              >
                Student
              </th>
              {sessionNumbers.map((number) => (
                <th
                  key={number}
                  scope="col"
                  className="px-2 py-3 text-center text-xs font-semibold text-ink-muted"
                >
                  {number}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-ink-muted uppercase"
              >
                Avg
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {grid.rows.map((row) => (
              <tr key={row.student_id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left font-normal"
                >
                  <span className="flex items-center gap-2.5">
                    <Avatar name={row.full_name} src={row.avatar_url} size="sm" />
                    <span className="truncate font-medium text-ink">{row.full_name}</span>
                  </span>
                </th>

                {sessionNumbers.map((number) => {
                  const session = row.sessions[number];
                  const tone = session?.attendance === "ABSENT" ? "danger" : scoreTone(session?.score);
                  const label = session?.attendance === "ABSENT"
                    ? "Abs"
                    : formatScoreCompact(session?.score);

                  return (
                    <td key={number} className="px-1 py-1.5 text-center">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => setEditing({ row, sessionNumber: number })}
                          aria-label={`Session ${number} for ${row.full_name}${
                            session?.score !== undefined && session?.score !== null
                              ? `, score ${session.score}`
                              : ", not graded"
                          }`}
                          className={cn(
                            "min-h-10 w-full min-w-11 rounded-lg px-2 py-1.5 text-sm font-medium tabular-nums transition-colors",
                            "hover:ring-2 hover:ring-brand/40",
                            CELL_TONES[tone],
                          )}
                        >
                          {label}
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex min-h-9 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums",
                            CELL_TONES[tone],
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </td>
                  );
                })}

                <td className="px-4 py-2.5 text-right">
                  <Badge tone={scoreTone(row.average_score)}>
                    {formatScore(row.average_score)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ----------------------------------------------------------- mobile */}
      <div className="md:hidden">
        <MobileScoreEntry grid={grid} period={period} canEdit={canEdit} />
      </div>

      {editing && (
        <SessionEditorDialog
          open
          onClose={() => setEditing(null)}
          classId={grid.class_id}
          period={period}
          studentId={editing.row.student_id}
          studentName={editing.row.full_name}
          sessionNumber={editing.sessionNumber}
          session={editing.row.sessions[editing.sessionNumber]}
        />
      )}
    </>
  );
}

/**
 * One student at a time, every session stacked, one sticky save (§53).
 * A spreadsheet on a phone is unusable; this is the same data as a form you
 * can fill with a thumb.
 */
function MobileScoreEntry({
  grid,
  period,
  canEdit,
}: {
  grid: ScoreGridData;
  period: Period;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(grid.rows[0]?.student_id ?? "");
  const [isPending, startTransition] = useTransition();

  const row = grid.rows.find((r) => r.student_id === studentId) ?? grid.rows[0];

  // Keyed by student so switching students resets the draft to their values.
  const [draft, setDraft] = useState<Record<number, { score: string; attendance: string }>>({});
  const [draftKey, setDraftKey] = useState(studentId);

  if (draftKey !== studentId) {
    setDraftKey(studentId);
    setDraft({});
  }

  if (!row) return null;

  const sessionNumbers = Array.from({ length: grid.sessions_per_month }, (_, i) => i + 1);

  const valueFor = (number: number) => {
    const existing = row.sessions[number];
    return (
      draft[number] ?? {
        score: existing?.score !== null && existing?.score !== undefined ? String(existing.score) : "",
        attendance: existing?.attendance ?? "",
      }
    );
  };

  const update = (number: number, patch: Partial<{ score: string; attendance: string }>) => {
    setDraft((current) => ({ ...current, [number]: { ...valueFor(number), ...patch } }));
  };

  function save() {
    startTransition(async () => {
      const result = await saveMonthAction(grid.class_id, {
        student_id: row.student_id,
        period_year: period.year,
        period_month: period.month,
        entries: sessionNumbers.map((number) => ({
          session_number: number,
          ...valueFor(number),
        })),
      });

      if (result.ok) {
        toast.success("Saved ✓");
        setDraft({});
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const isDirty = Object.keys(draft).length > 0;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Student</span>
        <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          {grid.rows.map((option) => (
            <option key={option.student_id} value={option.student_id}>
              {option.full_name}
            </option>
          ))}
        </Select>
      </label>

      <Card className="divide-y divide-line">
        {sessionNumbers.map((number) => {
          const value = valueFor(number);
          return (
            <div key={number} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">Session {number}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  max={10}
                  disabled={!canEdit}
                  value={value.score}
                  onChange={(event) => update(number, { score: event.target.value })}
                  placeholder="—"
                  aria-label={`Score for session ${number}`}
                  className="h-11 w-24 rounded-xl border border-line bg-card px-3 text-center text-base font-medium text-ink tabular-nums focus:border-brand focus:outline-none disabled:bg-muted"
                />
              </div>

              <div className="flex gap-2" role="group" aria-label={`Attendance for session ${number}`}>
                {ATTENDANCE_OPTIONS.map((option) => {
                  const active = value.attendance === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={!canEdit}
                      aria-pressed={active}
                      onClick={() =>
                        update(number, { attendance: active ? "" : option })
                      }
                      className={cn(
                        "min-h-10 flex-1 rounded-xl border px-2 text-sm font-medium transition-colors",
                        active
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-line text-ink-muted",
                        !canEdit && "opacity-60",
                      )}
                    >
                      {ATTENDANCE_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4">
        <div>
          <p className="text-sm text-ink-muted">Average</p>
          <p className="text-xl font-semibold text-ink tabular-nums">
            {formatScore(row.average_score)}
          </p>
        </div>
        <p className="text-sm text-ink-muted">
          Attendance {formatPercent(row.attendance_rate, 1)}
        </p>
      </div>

      {canEdit && (
        // Sticky above the bottom nav so the save button is always in reach.
        <div className="sticky bottom-20 z-10">
          <Button size="lg" onClick={save} loading={isPending} disabled={!isDirty} className="w-full shadow-md">
            <Save className="h-4 w-4" />
            {isDirty ? "Save changes" : "No changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
