import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, UserStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableWrapper } from "@/components/ui/table";
import { formatPercent, formatScore, scoreTone } from "@/lib/utils";
import type { StudentSummary } from "@/types/student";

/** Table on desktop, cards on mobile (§17, §51). Server-rendered — the rows
 *  are links, so nothing here needs to be a Client Component. */
export function StudentsTable({ students }: { students: StudentSummary[] }) {
  return (
    <>
      <TableWrapper className="hidden md:block">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH className="text-center">Classes</TH>
              <TH>Average</TH>
              <TH>Attendance</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {students.map((student) => (
              <TR key={student.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={student.full_name} src={student.avatar_url} size="sm" />
                    <Link
                      href={`/students/${student.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {student.full_name}
                    </Link>
                  </div>
                </TD>
                <TD className="text-ink-muted">{student.email ?? "—"}</TD>
                <TD className="text-ink-muted">{student.phone ?? "—"}</TD>
                <TD className="text-center tabular-nums">{student.class_count}</TD>
                <TD>
                  <Badge tone={scoreTone(student.average_score)}>
                    {formatScore(student.average_score)}
                  </Badge>
                </TD>
                <TD className="tabular-nums">{formatPercent(student.attendance_rate, 1)}</TD>
                <TD>
                  <UserStatusBadge status={student.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      <ul className="space-y-3 md:hidden">
        {students.map((student) => (
          <li key={student.id}>
            <Card className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar name={student.full_name} src={student.avatar_url} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/students/${student.id}`}
                    className="block truncate font-medium text-ink"
                  >
                    {student.full_name}
                  </Link>
                  <p className="truncate text-sm text-ink-muted">{student.email ?? "—"}</p>
                  <p className="truncate text-sm text-ink-muted">{student.phone ?? "—"}</p>
                </div>
                <UserStatusBadge status={student.status} />
              </div>

              <dl className="grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-subtle">Average</dt>
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
                <div>
                  <dt className="text-xs text-ink-subtle">Classes</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular-nums">
                    {student.class_count}
                  </dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
