import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, GraduationCap, Users } from "lucide-react";
import { getClassByCode } from "@/services/class.service";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { JoinButton } from "./join-button";
import { CLASS_TYPE_LABELS } from "@/types/class";

/** Public invite page, so it gets real metadata (§44). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ classCode: string }>;
}): Promise<Metadata> {
  const { classCode } = await params;
  if (!isSupabaseConfigured) return { title: "Join a class" };

  try {
    const klass = await getClassByCode(classCode);
    if (!klass) return { title: "Class not found" };

    return {
      title: `Join ${klass.name}`,
      description: `${klass.name} (${klass.code}) — ${klass.sessions_per_month} lessons per month with ${klass.teacher_name ?? "AbbaGuitar"}.`,
    };
  } catch {
    return { title: "Join a class" };
  }
}

export default async function JoinClassPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const { classCode } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 py-6 sm:px-8">
        <Link href="/dashboard" aria-label="AbbaGuitar home">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center sm:px-6">
        <div className="w-full max-w-md">
          <JoinContent classCode={classCode} />
        </div>
      </main>
    </div>
  );
}

async function JoinContent({ classCode }: { classCode: string }) {
  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        title="Not configured yet"
        description="Add your Supabase credentials to .env.local to enable class invitations."
      />
    );
  }

  const [klass, user] = await Promise.all([getClassByCode(classCode), getSessionUser()]);

  if (!klass) {
    return (
      <EmptyState
        icon={<span aria-hidden="true">🔍</span>}
        title="Class not found"
        description={`No class matches the code ${classCode.toUpperCase()}. Check the link and try again.`}
        action={<LinkButton href="/dashboard">Go to dashboard</LinkButton>}
      />
    );
  }

  const isFull = klass.member_count >= klass.max_students;
  const isActive = klass.status === "ACTIVE";

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <span className="text-4xl" aria-hidden="true">
            🎸
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{klass.name}</h1>
          <p className="font-mono text-sm tracking-wide text-ink-muted">{klass.code}</p>
          <div className="flex justify-center">
            <Badge tone="brand">{CLASS_TYPE_LABELS[klass.class_type]}</Badge>
          </div>
        </div>

        <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Teacher
            </dt>
            <dd className="font-medium text-ink">{klass.teacher_name ?? "To be assigned"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Lessons
            </dt>
            <dd className="font-medium text-ink">{klass.sessions_per_month} per month</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <Users className="h-4 w-4" aria-hidden="true" />
              Students
            </dt>
            <dd className="font-medium text-ink tabular-nums">
              {klass.member_count} / {klass.max_students}
            </dd>
          </div>
        </dl>

        {!user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-ink-muted">
              Please sign in to join this class.
            </p>
            <LinkButton
              href={`/login?redirectTo=${encodeURIComponent(`/join/${klass.code}`)}`}
              size="lg"
              className="w-full"
            >
              Sign in
            </LinkButton>
          </div>
        ) : klass.is_member ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-success">You are already in this class.</p>
            <LinkButton href={`/classes/${klass.id}`} size="lg" className="w-full">
              Go to class
            </LinkButton>
          </div>
        ) : user.profile.role !== "STUDENT" ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            Invite links are for student accounts. You are signed in as{" "}
            {user.profile.role.toLowerCase()}.
          </p>
        ) : !isActive ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            This class is not accepting new students.
          </p>
        ) : isFull ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            This class is full.
          </p>
        ) : (
          <JoinButton code={klass.code} />
        )}
      </CardContent>
    </Card>
  );
}
