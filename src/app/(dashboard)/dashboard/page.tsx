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
import { currentPeriod, formatPercent, formatScore, formatPeriod, greetingForNow } from "@/lib/utils";
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
import { ROLE_LABELS } from "@/types/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireAuth();
  const period = currentPeriod();
  const greeting = `${greetingForNow()}, ${user.profile.full_name.split(" ").slice(-1)[0]} 👋`;

  if (user.profile.role === "ADMIN") {
    const data = await getAdminDashboard(period);

    return (
      <>
        <PageHeader
          title={greeting}
          description="Here's what's happening with your classes today."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total classes"
            value={data.stats.totalClasses}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label="Active teachers"
            value={data.stats.activeTeachers}
            icon={<GraduationCap className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Total students"
            value={data.stats.totalStudents}
            icon={<Users className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label="Lessons this month"
            value={data.stats.lessonsThisMonth}
            hint={formatPeriod(period)}
            icon={<CalendarCheck className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Average score</CardTitle>
                <p className="text-sm text-ink-muted">Across all classes, last 6 months</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ScoreTrendChart data={data.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
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
                <CardTitle>Class performance</CardTitle>
                <p className="text-sm text-ink-muted">Average score, {formatPeriod(period)}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ClassPerformanceChart data={data.classPerformance} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ActivityFeed items={data.activity} />
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Active classes</h2>
            <LinkButton href="/classes" variant="outline" size="sm">
              View all
            </LinkButton>
          </div>

          {data.classes.length === 0 ? (
            <EmptyState
              icon={<span aria-hidden="true">🎸</span>}
              title="No classes yet"
              description="Create your first class to start managing your students and lessons."
              action={<LinkButton href="/classes/create">Create class</LinkButton>}
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
        <PageHeader title={greeting} description="Your classes and students at a glance." />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My classes"
            value={data.stats.classCount}
            icon={<BookOpen className="h-5 w-5" />}
          />
          <StatCard
            label="My students"
            value={data.stats.studentCount}
            icon={<Users className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label="Lessons this month"
            value={data.stats.lessonsThisMonth}
            hint={formatPeriod(period)}
            icon={<CalendarCheck className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label="Average score"
            value={formatScore(data.stats.averageScore)}
            hint="out of 10"
            icon={<Star className="h-5 w-5" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle>Average score</CardTitle>
                <p className="text-sm text-ink-muted">Your classes, last 6 months</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ScoreTrendChart data={data.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <AttendanceSummary {...data.attendance} />
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-ink">My classes</h2>

          {data.classes.length === 0 ? (
            <EmptyState
              icon={<span aria-hidden="true">🎸</span>}
              title="No classes assigned yet"
              description="Once an administrator assigns you a class, it will appear here."
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
        description={`Signed in as a ${ROLE_LABELS[user.profile.role].toLowerCase()}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My classes"
          value={data.stats.classCount}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Lessons completed"
          value={data.stats.lessonsCompleted}
          hint={formatPeriod(period)}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Average score"
          value={formatScore(data.stats.averageScore)}
          hint="out of 10"
          icon={<Star className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Attendance"
          value={formatPercent(data.stats.attendanceRate, 1)}
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink">My classes</h2>

        {data.classes.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true">🎸</span>}
            title="You are not in a class yet"
            description="Ask your teacher for an invite link, or a class code to join with."
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
