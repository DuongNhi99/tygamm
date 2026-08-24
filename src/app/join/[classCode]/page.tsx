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
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";

/** Public invite page, so it gets real metadata (§44). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ classCode: string }>;
}): Promise<Metadata> {
  const [{ classCode }, dict] = await Promise.all([params, getDictionary()]);
  if (!isSupabaseConfigured) return { title: dict.join.meta };

  try {
    const klass = await getClassByCode(classCode);
    if (!klass) return { title: dict.join.metaNotFound };

    return {
      title: interpolate(dict.join.metaJoin, { name: klass.name }),
      description: interpolate(dict.join.metaDescription, {
        name: klass.name,
        code: klass.code,
        count: klass.sessions_per_month,
        teacher: klass.teacher_name ?? dict.app.name,
      }),
    };
  } catch {
    return { title: dict.join.meta };
  }
}

export default async function JoinClassPage({
  params,
}: {
  params: Promise<{ classCode: string }>;
}) {
  const [{ classCode }, dict] = await Promise.all([params, getDictionary()]);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-4 py-6 sm:px-8">
        <Link href="/dashboard" aria-label={dict.app.home}>
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
  const dict = await getDictionary();

  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        title={dict.join.notConfiguredTitle}
        description={dict.join.notConfiguredBody}
      />
    );
  }

  const [klass, user] = await Promise.all([getClassByCode(classCode), getSessionUser()]);

  if (!klass) {
    return (
      <EmptyState
        icon={<span aria-hidden="true">🔍</span>}
        title={dict.join.notFoundTitle}
        description={interpolate(dict.join.notFoundBody, {
          code: classCode.toUpperCase(),
        })}
        action={<LinkButton href="/dashboard">{dict.join.goToDashboard}</LinkButton>}
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
            <Badge tone="brand">{dict.classTypes.labels[klass.class_type]}</Badge>
          </div>
        </div>

        <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              {dict.common.teacher}
            </dt>
            <dd className="font-medium text-ink">
              {klass.teacher_name ?? dict.common.toBeAssigned}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              {dict.common.lessons}
            </dt>
            <dd className="font-medium text-ink">
              {interpolate(dict.join.lessonsPerMonth, { count: klass.sessions_per_month })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-ink-muted">
              <Users className="h-4 w-4" aria-hidden="true" />
              {dict.common.students}
            </dt>
            <dd className="font-medium text-ink tabular-nums">
              {klass.member_count} / {klass.max_students}
            </dd>
          </div>
        </dl>

        {!user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-ink-muted">{dict.join.signInPrompt}</p>
            <LinkButton
              href={`/login?redirectTo=${encodeURIComponent(`/join/${klass.code}`)}`}
              size="lg"
              className="w-full"
            >
              {dict.common.signIn}
            </LinkButton>
          </div>
        ) : klass.is_member ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-success">{dict.join.alreadyMember}</p>
            <LinkButton href={`/classes/${klass.id}`} size="lg" className="w-full">
              {dict.join.goToClass}
            </LinkButton>
          </div>
        ) : user.profile.role !== "STUDENT" ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            {interpolate(dict.join.staffAccount, {
              role: dict.roles[user.profile.role].toLowerCase(),
            })}
          </p>
        ) : !isActive ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            {dict.join.notAccepting}
          </p>
        ) : isFull ? (
          <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-center text-sm text-warning">
            {dict.join.full}
          </p>
        ) : (
          <JoinButton code={klass.code} />
        )}
      </CardContent>
    </Card>
  );
}
