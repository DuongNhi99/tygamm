"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Table, TBody, TD, TH, THead, TR, TableWrapper } from "@/components/ui/table";
import { formatPercent, formatScore, scoreTone } from "@/lib/utils";
import { removeStudentFromClassAction } from "@/app/(dashboard)/classes/[classId]/actions";
import type { ClassStudent } from "@/types/student";

/**
 * A table on desktop, cards on mobile (§17). Two renderings of the same data
 * rather than a squeezed table — a seven-column roster is unreadable on a
 * phone however hard it scrolls.
 */
export function ClassStudents({
  classId,
  students,
  canManage,
}: {
  classId: string;
  students: ClassStudent[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingRemoval, setPendingRemoval] = useState<ClassStudent | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!pendingRemoval) return;
    const student = pendingRemoval;

    startTransition(async () => {
      const result = await removeStudentFromClassAction(classId, student.student_id);
      if (result.ok) {
        toast.success(`${student.full_name} removed from the class`);
        setPendingRemoval(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {/* Desktop */}
      <TableWrapper className="hidden md:block">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Student</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Attendance</TH>
              <TH>Average</TH>
              <TH>Status</TH>
              {canManage && <TH className="w-12 text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {students.map((student) => (
              <TR key={student.member_id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={student.full_name} src={student.avatar_url} size="sm" />
                    <Link
                      href={`/students/${student.student_id}`}
                      className="font-medium hover:text-brand"
                    >
                      {student.full_name}
                    </Link>
                  </div>
                </TD>
                <TD className="text-ink-muted">{student.email ?? "—"}</TD>
                <TD className="text-ink-muted">{student.phone ?? "—"}</TD>
                <TD className="tabular-nums">{formatPercent(student.attendance_rate, 1)}</TD>
                <TD>
                  <Badge tone={scoreTone(student.average_score)}>
                    {formatScore(student.average_score)}
                  </Badge>
                </TD>
                <TD>
                  <Badge tone={student.member_status === "ACTIVE" ? "success" : "neutral"}>
                    {student.member_status === "ACTIVE" ? "Active" : "Removed"}
                  </Badge>
                </TD>
                {canManage && (
                  <TD className="text-right">
                    {student.member_status === "ACTIVE" && (
                      <Dropdown
                        label={`Actions for ${student.full_name}`}
                        trigger={<MoreVertical className="h-4 w-4" />}
                      >
                        {(close) => (
                          <DropdownItem
                            destructive
                            onClick={() => {
                              close();
                              setPendingRemoval(student);
                            }}
                          >
                            <UserMinus className="h-4 w-4" />
                            Remove from class
                          </DropdownItem>
                        )}
                      </Dropdown>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {students.map((student) => (
          <li key={student.member_id}>
            <Card className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar name={student.full_name} src={student.avatar_url} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/students/${student.student_id}`}
                    className="block truncate font-medium text-ink"
                  >
                    {student.full_name}
                  </Link>
                  <p className="truncate text-sm text-ink-muted">{student.email ?? "—"}</p>
                  <p className="truncate text-sm text-ink-muted">{student.phone ?? "—"}</p>
                </div>
                {canManage && student.member_status === "ACTIVE" && (
                  <Dropdown
                    label={`Actions for ${student.full_name}`}
                    trigger={<MoreVertical className="h-4 w-4" />}
                  >
                    {(close) => (
                      <DropdownItem
                        destructive
                        onClick={() => {
                          close();
                          setPendingRemoval(student);
                        }}
                      >
                        <UserMinus className="h-4 w-4" />
                        Remove from class
                      </DropdownItem>
                    )}
                  </Dropdown>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-subtle">Average score</dt>
                  <dd className="mt-0.5">
                    <Badge tone={scoreTone(student.average_score)}>
                      {formatScore(student.average_score)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-subtle">Attendance</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular-nums">
                    {formatPercent(student.attendance_rate, 1)}
                  </dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={remove}
        loading={isPending}
        title="Remove this student?"
        description={`${pendingRemoval?.full_name ?? "This student"} will be removed from the class. Their recorded lessons and scores are kept.`}
        confirmLabel="Remove student"
      />
    </>
  );
}
