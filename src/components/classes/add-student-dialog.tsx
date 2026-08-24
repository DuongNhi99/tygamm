"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addStudentToClassAction,
  createAndAddStudentAction,
  searchStudentsAction,
} from "@/app/(dashboard)/classes/[classId]/actions";
import { useDict } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/translate";
import type { StudentSearchRow } from "@/types/database";

type Mode = "search" | "create";

/**
 * Add a student by email or phone (§14). Search first; if nobody matches,
 * the same dialog switches to creating the student and enrolling them.
 */
export function AddStudentDialog({
  classId,
  isFull,
  className,
}: {
  classId: string;
  isFull: boolean;
  className?: string;
}) {
  const router = useRouter();
  const dict = useDict();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchRow[] | null>(null);
  const [isSearching, startSearching] = useTransition();
  const [isAdding, startAdding] = useTransition();

  const [createState, createAction, isCreating] = useActionState(
    createAndAddStudentAction.bind(null, classId),
    null,
  );

  useEffect(() => {
    if (!createState) return;

    if (createState.ok) {
      toast.success(dict.classes.addStudent.createdAndAdded, {
        description: interpolate(dict.createUser.temporaryPassword, {
          password: createState.data,
        }),
        duration: 15000,
      });
      reset();
      router.refresh();
    } else if (!createState.fieldErrors) {
      toast.error(createState.error);
    }
    // `reset` and `router` are stable for this dialog's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState]);

  function reset() {
    setOpen(false);
    setMode("search");
    setQuery("");
    setResults(null);
  }

  function search() {
    startSearching(async () => {
      const result = await searchStudentsAction(query);
      if (result.ok) setResults(result.data);
      else {
        toast.error(result.error);
        setResults([]);
      }
    });
  }

  function add(studentId: string) {
    startAdding(async () => {
      const result = await addStudentToClassAction(classId, studentId);
      if (result.ok) {
        toast.success(dict.classes.addStudent.added);
        reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const createErrors = createState && !createState.ok ? (createState.fieldErrors ?? {}) : {};

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={isFull} className={className}>
        <UserPlus className="h-4 w-4" />
        {dict.classes.addStudent.button}
      </Button>

      <Dialog
        open={open}
        onClose={reset}
        title={
          mode === "search"
            ? dict.classes.addStudent.searchTitle
            : dict.classes.addStudent.createTitle
        }
        description={
          mode === "search"
            ? dict.classes.addStudent.searchSubtitle
            : dict.classes.addStudent.createSubtitle
        }
        footer={
          mode === "create" ? (
            <>
              <Button variant="outline" onClick={() => setMode("search")} disabled={isCreating}>
                {dict.classes.addStudent.backToSearch}
              </Button>
              <Button type="submit" form="create-student-form" loading={isCreating}>
                {dict.classes.addStudent.createTitle}
              </Button>
            </>
          ) : undefined
        }
      >
        {mode === "search" ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    search();
                  }
                }}
                placeholder={dict.classes.addStudent.queryPlaceholder}
                aria-label={dict.classes.addStudent.queryLabel}
              />
              <Button onClick={search} loading={isSearching} className="shrink-0">
                {!isSearching && <Search className="h-4 w-4" />}
                {dict.common.search}
              </Button>
            </div>

            {results !== null &&
              (results.length > 0 ? (
                <ul className="space-y-2">
                  {results.map((student) => (
                    <li
                      key={student.id}
                      className="flex items-center gap-3 rounded-xl border border-line p-3"
                    >
                      <Avatar name={student.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {student.full_name}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {[student.email, student.phone].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => add(student.id)} loading={isAdding}>
                        {dict.common.add}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title={dict.classes.addStudent.notFoundTitle}
                  description={dict.classes.addStudent.notFoundBody}
                  action={
                    <Button variant="outline" onClick={() => setMode("create")}>
                      {dict.classes.addStudent.createTitle}
                    </Button>
                  }
                  className="py-8"
                />
              ))}
          </div>
        ) : (
          <form id="create-student-form" action={createAction} className="space-y-4" noValidate>
            {createState && !createState.ok && !createState.fieldErrors && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {createState.error}
              </div>
            )}

            <Field label={dict.common.fullName} htmlFor="full_name" error={createErrors.full_name} required>
              <Input id="full_name" name="full_name" required defaultValue={query.includes("@") ? "" : query} />
            </Field>

            <Field
              label={dict.common.email}
              htmlFor="email"
              error={createErrors.email}
              hint={dict.classes.addStudent.emailHint}
              required
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={query.includes("@") ? query : ""}
              />
            </Field>

            <Field label={dict.common.phone} htmlFor="phone" error={createErrors.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={/^[0-9+()\-\s]+$/.test(query) ? query : ""}
              />
            </Field>
          </form>
        )}
      </Dialog>
    </>
  );
}
