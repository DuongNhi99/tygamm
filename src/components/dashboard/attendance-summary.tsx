import { formatPercent, roundTo } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";

/**
 * Attendance as a meter plus labelled counts, not a donut.
 *
 * A green/red present/absent pair measures ΔE 4.1 under deuteranopia — two
 * slices a red-green colourblind reader cannot separate. The rate is a single
 * ratio against a limit, which is a meter's job anyway, and the breakdown
 * carries a text label beside every badge so nothing is encoded by colour
 * alone (§24, §54).
 */
export function AttendanceSummary({
  present,
  absent,
  makeup,
}: {
  present: number;
  absent: number;
  makeup: number;
}) {
  const recorded = present + absent + makeup;
  // A made-up lesson still happened, so it counts as attended — same rule as
  // recompute_monthly_progress() in migration 005.
  const attended = present + makeup;
  const rate = recorded > 0 ? roundTo((attended * 100) / recorded, 2) : null;

  const rows = [
    { label: "Present", value: present, tone: "success" as const },
    { label: "Absent", value: absent, tone: "danger" as const },
    { label: "Makeup", value: makeup, tone: "warning" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-ink-muted">Attendance rate</span>
          <span className="text-2xl font-semibold text-ink tabular-nums">
            {rate === null ? "—" : formatPercent(rate, 1)}
          </span>
        </div>
        <ProgressBar value={rate ?? 0} label="Attendance rate" />
        <p className="text-xs text-ink-subtle">
          {recorded === 0
            ? "No attendance recorded this month yet."
            : `${attended} of ${recorded} lessons attended`}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1.5">
            <dt>
              <Badge tone={row.tone}>{row.label}</Badge>
            </dt>
            <dd className="text-xl font-semibold text-ink tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
