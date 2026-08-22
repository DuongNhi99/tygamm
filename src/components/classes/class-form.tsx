"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import {
  createClassAction,
  suggestClassCodeAction,
  updateClassAction,
} from "@/app/(dashboard)/classes/actions";
import { CLASS_TYPE_DESCRIPTIONS, CLASS_TYPE_LABELS } from "@/types/class";
import type { ClassRow, ClassType } from "@/types/database";
import type { ActionResult } from "@/lib/errors";

const CLASS_TYPES: ClassType[] = ["ONE_TO_ONE", "ONE_TO_TWO", "GROUP"];

export function ClassForm({
  klass,
  teachers,
  defaultSessionsPerMonth,
  canReassignTeacher,
}: {
  klass?: ClassRow;
  teachers: Array<{ id: string; full_name: string }>;
  defaultSessionsPerMonth: number;
  canReassignTeacher: boolean;
}) {
  const router = useRouter();
  const isEdit = Boolean(klass);

  const action = isEdit
    ? updateClassAction.bind(null, klass!.id)
    : (createClassAction as (
        prev: ActionResult<string> | null,
        formData: FormData,
      ) => Promise<ActionResult<string>>);

  const [state, formAction, isPending] = useActionState(action, null);

  const [name, setName] = useState(klass?.name ?? "");
  const [code, setCode] = useState(klass?.code ?? "");
  const [classType, setClassType] = useState<ClassType>(klass?.class_type ?? "GROUP");
  const [maxStudents, setMaxStudents] = useState(String(klass?.max_students ?? 8));
  const [isSuggesting, startSuggesting] = useTransition();

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok && !state.fieldErrors ? state.error : null;

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Class updated" : "Class created successfully");
      router.push(`/classes/${state.data}`);
    }
  }, [state, isEdit, router]);

  // Capacity is implied by the class type for the two fixed shapes; only a
  // group class lets the admin choose (§12).
  const capacityLocked = classType !== "GROUP";
  const effectiveCapacity =
    classType === "ONE_TO_ONE" ? "1" : classType === "ONE_TO_TWO" ? "2" : maxStudents;

  function generateCode() {
    startSuggesting(async () => {
      const result = await suggestClassCodeAction(name);
      if (result.ok) setCode(result.data);
      else toast.error(result.error);
    });
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Card>
        <CardContent className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {formError}
            </div>
          )}

          <Field label="Class name" htmlFor="name" error={fieldErrors.name} required>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Guitar Beginner"
              required
              aria-invalid={Boolean(fieldErrors.name)}
            />
          </Field>

          <Field
            label="Class code"
            htmlFor="code"
            error={fieldErrors.code}
            hint="Students use this code to join. It must be unique."
            required
          >
            <div className="flex gap-2">
              <Input
                id="code"
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="GT-BG-0826"
                required
                className="font-mono tracking-wide"
                aria-invalid={Boolean(fieldErrors.code)}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={generateCode}
                loading={isSuggesting}
                aria-label="Generate a new class code"
                className="h-11 w-11 shrink-0"
              >
                {!isSuggesting && <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">
              Class type
              <span className="text-danger" aria-hidden="true">
                {" "}
                *
              </span>
            </legend>

            <div className="grid gap-2 sm:grid-cols-3">
              {CLASS_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                    classType === type
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="class_type"
                    value={type}
                    checked={classType === type}
                    onChange={() => setClassType(type)}
                    className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">
                      {CLASS_TYPE_LABELS[type]}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {CLASS_TYPE_DESCRIPTIONS[type]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Maximum students"
              htmlFor="max_students"
              error={fieldErrors.max_students}
              hint={capacityLocked ? "Set by the class type" : undefined}
              required
            >
              <Input
                id="max_students"
                name="max_students"
                type="number"
                min={1}
                max={100}
                value={effectiveCapacity}
                onChange={(event) => setMaxStudents(event.target.value)}
                disabled={capacityLocked}
                required
                aria-invalid={Boolean(fieldErrors.max_students)}
              />
            </Field>

            <Field
              label="Lessons per month"
              htmlFor="sessions_per_month"
              error={fieldErrors.sessions_per_month}
              required
            >
              <Input
                id="sessions_per_month"
                name="sessions_per_month"
                type="number"
                min={1}
                max={31}
                defaultValue={klass?.sessions_per_month ?? defaultSessionsPerMonth}
                required
                aria-invalid={Boolean(fieldErrors.sessions_per_month)}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Teacher" htmlFor="teacher_id" error={fieldErrors.teacher_id}>
              <Select
                id="teacher_id"
                name="teacher_id"
                defaultValue={klass?.teacher_id ?? ""}
                disabled={!canReassignTeacher}
                aria-invalid={Boolean(fieldErrors.teacher_id)}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Start date" htmlFor="start_date" error={fieldErrors.start_date}>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={klass?.start_date ?? ""}
                aria-invalid={Boolean(fieldErrors.start_date)}
              />
            </Field>
          </div>

          <Field label="Status" htmlFor="status" error={fieldErrors.status} required>
            <Select id="status" name="status" defaultValue={klass?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              {isEdit && <option value="ARCHIVED">Archived</option>}
            </Select>
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save changes" : "Create class"}
          </Button>
        </CardFooter>
      </Card>

      {/* Disabled inputs are not submitted, so mirror the locked values. */}
      {capacityLocked && <input type="hidden" name="max_students" value={effectiveCapacity} />}
      {!canReassignTeacher && (
        <input type="hidden" name="teacher_id" value={klass?.teacher_id ?? ""} />
      )}
    </form>
  );
}
