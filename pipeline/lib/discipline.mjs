// The weekly rhythm's one hard signal: a week whose last post date is more
// than three days gone and still has no row in data/performance.csv means
// the Thursday intake was skipped. The planner must not build on a week
// nobody measured, so validate says so loudly every run until the rows land.
const DAY = 24 * 60 * 60 * 1000;
export const INTAKE_GRACE_DAYS = 3;

export function overdueIntakeWeeks(weeks, rows, today = new Date()) {
  const measured = new Set(rows.map((row) => row.slug));
  const overdue = [];
  for (const [week, specs] of weeks) {
    const lastDate = specs.map((spec) => spec.post_date).filter(Boolean).sort().at(-1);
    if (!lastDate) continue;
    const due = new Date(`${lastDate}T00:00:00Z`).getTime() + INTAKE_GRACE_DAYS * DAY;
    if (today.getTime() < due) continue;
    if (specs.some((spec) => measured.has(spec.slug))) continue;
    overdue.push({ week, lastDate, posts: specs.length });
  }
  return overdue.sort((a, b) => a.lastDate.localeCompare(b.lastDate));
}
