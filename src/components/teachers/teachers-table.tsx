"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { UserStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Field, Input, Select } from "@/components/ui/field";
import { Table, TBody, TD, TH, THead, TR, TableWrapper } from "@/components/ui/table";
import { updateUserAction } from "@/app/(dashboard)/students/actions";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";
import type { TeacherSummary } from "@/types/student";

export function TeachersTable({ teachers }: { teachers: TeacherSummary[] }) {
  const dict = useDict();
  const [editing, setEditing] = useState<TeacherSummary | null>(null);

  return (
    <>
      <TableWrapper className="hidden md:block">
        <Table>
          <THead>
            <TR className="hover:bg-transparent">
              <TH>{dict.students.name}</TH>
              <TH>{dict.common.email}</TH>
              <TH>{dict.common.phone}</TH>
              <TH className="text-center">{dict.common.classes}</TH>
              <TH className="text-center">{dict.common.students}</TH>
              <TH>{dict.common.status}</TH>
              <TH className="w-12 text-right">{dict.common.actions}</TH>
            </TR>
          </THead>
          <TBody>
            {teachers.map((teacher) => (
              <TR key={teacher.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={teacher.full_name} src={teacher.avatar_url} size="sm" />
                    <Link
                      href={`/classes?teacher=${teacher.id}`}
                      className="font-medium hover:text-brand"
                    >
                      {teacher.full_name}
                    </Link>
                  </div>
                </TD>
                <TD className="text-ink-muted">{teacher.email ?? "—"}</TD>
                <TD className="text-ink-muted">{teacher.phone ?? "—"}</TD>
                <TD className="text-center tabular-nums">{teacher.class_count}</TD>
                <TD className="text-center tabular-nums">{teacher.student_count}</TD>
                <TD>
                  <UserStatusBadge status={teacher.status} />
                </TD>
                <TD className="text-right">
                  <Dropdown
                    label={interpolate(dict.classes.students.actionsFor, {
                      name: teacher.full_name,
                    })}
                    trigger={<MoreVertical className="h-4 w-4" />}
                  >
                    {(close) => (
                      <>
                        <Link
                          href={`/classes?teacher=${teacher.id}`}
                          role="menuitem"
                          onClick={close}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-muted"
                        >
                          {dict.teachers.viewClasses}
                        </Link>
                        <DropdownItem
                          onClick={() => {
                            close();
                            setEditing(teacher);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          {dict.teachers.editTeacher}
                        </DropdownItem>
                      </>
                    )}
                  </Dropdown>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrapper>

      <ul className="space-y-3 md:hidden">
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            <Card className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Avatar name={teacher.full_name} src={teacher.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{teacher.full_name}</p>
                  <p className="truncate text-sm text-ink-muted">{teacher.email ?? "—"}</p>
                  <p className="truncate text-sm text-ink-muted">{teacher.phone ?? "—"}</p>
                </div>
                <UserStatusBadge status={teacher.status} />
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                <div>
                  <dt className="text-xs text-ink-subtle">{dict.common.classes}</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular-nums">
                    {teacher.class_count}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-subtle">{dict.common.students}</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular-nums">
                    {teacher.student_count}
                  </dd>
                </div>
              </dl>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditing(teacher)}
                >
                  {dict.common.edit}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/**
 * Deactivate rather than delete (§29): the account keeps its history, and a
 * deactivated user is bounced at `requireAuth` on their next request.
 */
function EditUserDialog({
  user,
  onClose,
}: {
  user: TeacherSummary | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const dict = useDict();
  const [state, formAction, isPending] = useActionState(updateUserAction, null);

  useEffect(() => {
    if (!state) return;

    if (state.ok) {
      toast.success(dict.teachers.updated);
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
      open={user !== null}
      onClose={onClose}
      title={dict.teachers.editTeacher}
      description={user?.email ?? undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" form="edit-user-form" loading={isPending}>
            {dict.common.saveChanges}
          </Button>
        </>
      }
    >
      {user && (
        <form id="edit-user-form" key={user.id} action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={user.id} />

          <Field
            label={dict.common.fullName}
            htmlFor="eu_full_name"
            error={fieldErrors.full_name}
            required
          >
            <Input id="eu_full_name" name="full_name" defaultValue={user.full_name} required />
          </Field>

          <Field label={dict.common.phone} htmlFor="eu_phone" error={fieldErrors.phone}>
            <Input id="eu_phone" name="phone" type="tel" defaultValue={user.phone ?? ""} />
          </Field>

          <Field
            label={dict.common.status}
            htmlFor="eu_status"
            error={fieldErrors.status}
            hint={dict.teachers.statusHint}
            required
          >
            <Select id="eu_status" name="status" defaultValue={user.status}>
              <option value="ACTIVE">{dict.common.active}</option>
              <option value="INACTIVE">{dict.common.inactive}</option>
            </Select>
          </Field>
        </form>
      )}
    </Dialog>
  );
}
