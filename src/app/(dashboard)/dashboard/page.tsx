import type { Metadata } from "next";
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Percent,
  Star,
  Users,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import {
  getAdminDashboard,
  getStudentDashboard,
  getTeacherDashboard,
} from "@/services/dashboard.service";
import { currentPeriod, formatPercent, formatScore } from "@/lib/utils";
import { getI18n } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/translate";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ClassCard } from "@/components/classes/class-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttendanceSummary } from "@/components/dashboard/attendance-summary";
import { ScoreTrendChart } from "@/components/dashboard/score-trend-chart";
import { ClassPerformanceChart } from "@/components/dashboard/class-performance-chart";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.dashboard.meta };
}

export default async function DashboardPage() {
  const [user, { dict, fmt }] = await Promise.all([requireAuth(), getI18n()]);
  const period = currentPeriod();

  // Vietnamese and Chinese both put the given name last, and English here
  // already greets by last word, so the same rule serves all three.
  const greeting = interpolate(dict.dashboard.greeting, {
    greeting: fmt.greeting(),
    name: user.profile.full_name.split(" ").slice(-1)[0],
  });
  const periodLabel = fmt.formatPeriod(period);

  if (user.profile.role === "ADMIN") {
    const data = await getAdminDashboard(period);

    return (
      <>
        <PageHeader
          title={greeting}
          description={dict.dashboard.adminSubtitle}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={dict.dashboard.totalClasses}
            value={data.stats.totalClasses}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label={dict.dashboard.activeTeachers}
            value={data.stats.activeTeachers}
            icon={<GraduationCap className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={dict.dashboard.totalStudents}
            value={data.stats.totalStudents}
            icon={<Users className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label={dict.dashboard.lessonsThisMonth}
            value={data.stats.lessonsThisMonth}
            hint={periodLabel}
            icon={<CalendarCheck className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>{dict.dashboard.averageScore}</CardTitle>
                <p className="text-sm text-ink-muted">{dict.dashboard.averageScoreAllClasses}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ScoreTrendChart data={data.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.common.attendance}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AttendanceSummary {...data.attendance} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>{dict.dashboard.classPerformance}</CardTitle>
                <p className="text-sm text-ink-muted">
                  {interpolate(dict.dashboard.classPerformanceHint, { period: periodLabel })}
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ClassPerformanceChart data={data.classPerformance} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ActivityFeed items={data.activity} />
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{dict.dashboard.activeClasses}</h2>
            <LinkButton href="/classes" variant="outline" size="sm">
              {dict.common.viewAll}
            </LinkButton>
          </div>

          {data.classes.length === 0 ? (
            <EmptyState
              icon={<span aria-hidden="true">🎸</span>}
              title={dict.dashboard.noClassesTitle}
              description={dict.dashboard.noClassesBody}
              action={<LinkButton href="/classes/create">{dict.classes.create}</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.classes.map((klass) => (
                <ClassCard key={klass.id} klass={klass} />
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  if (user.profile.role === "TEACHER") {
    const data = await getTeacherDashboard(user.id, period);

    return (
      <>
        <PageHeader title={greeting} description={dict.dashboard.teacherSubtitle} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={dict.dashboard.myClasses}
            value={data.stats.classCount}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label={dict.dashboard.myStudents}
            value={data.stats.studentCount}
            icon={<Users className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={dict.dashboard.lessonsThisMonth}
            value={data.stats.lessonsThisMonth}
            hint={periodLabel}
            icon={<CalendarCheck className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label={dict.dashboard.averageScore}
            value={formatScore(data.stats.averageScore)}
            hint={dict.common.outOf10}
            icon={<Star className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>{dict.dashboard.averageScore}</CardTitle>
                <p className="text-sm text-ink-muted">{dict.dashboard.averageScoreMyClasses}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ScoreTrendChart data={data.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.common.attendance}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AttendanceSummary {...data.attendance} />
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">{dict.dashboard.myClasses}</h2>

          {data.classes.length === 0 ? (
            <EmptyState
              icon={<span aria-hidden="true">🎸</span>}
              title={dict.dashboard.noAssignedTitle}
              description={dict.dashboard.noAssignedBody}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.classes.map((klass) => (
                <ClassCard key={klass.id} klass={klass} />
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  // STUDENT
  const data = await getStudentDashboard(user.id, period);

  return (
    <>
      <PageHeader
        title={greeting}
        description={interpolate(dict.dashboard.studentSubtitle, {
          role: dict.roles[user.profile.role].toLowerCase(),
        })}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dict.dashboard.myClasses}
          value={data.stats.classCount}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label={dict.dashboard.lessonsCompleted}
          value={data.stats.lessonsCompleted}
          hint={periodLabel}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={dict.dashboard.averageScore}
          value={formatScore(data.stats.averageScore)}
          hint={dict.common.outOf10}
          icon={<Star className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={dict.common.attendance}
          value={formatPercent(data.stats.attendanceRate, 1)}
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink">{dict.dashboard.myClasses}</h2>

        {data.classes.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true">🎸</span>}
            title={dict.dashboard.notInClassTitle}
            description={dict.dashboard.notInClassBody}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.classes.map((klass) => (
              <ClassCard key={klass.id} klass={klass} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
