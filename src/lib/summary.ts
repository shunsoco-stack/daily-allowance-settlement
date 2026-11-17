import { calculate } from "./calc";
import { inPeriod, weekFor } from "./dates";
import { categories, type Data, type Entry, type Period, type Rule, type Snapshot } from "./types";
import { workMinutes } from "./time";

export function summarize(entries: Entry[], rules: Rule[], period: Period) {
  const rows = entries
    .filter((e) => inPeriod(e.date, period))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((entry) => ({ entry, calc: calculate(entry, rules) }));
  const totals = Object.fromEntries(categories.map((c) => [c, 0])) as Record<
    (typeof categories)[number],
    number
  >;
  const sites: Record<string, number> = {};
  const weeks: Record<string, number> = {};
  for (const { entry, calc } of rows) {
    for (const line of calc.lines) totals[line.category] += line.amount;
    const week = weekFor(entry.date).start;
    weeks[week] = (weeks[week] || 0) + calc.total;
    let allocated = 0;
    entry.works.forEach((w, index) => {
      const amount =
        index === entry.works.length - 1
          ? calc.total - allocated
          : Math.round(
              calc.total * (calc.minutes ? workMinutes(w) / calc.minutes : 1 / entry.works.length),
            );
      sites[w.siteId] = (sites[w.siteId] || 0) + amount;
      allocated += amount;
    });
  }
  return { rows, totals, sites, weeks, total: rows.reduce((sum, r) => sum + r.calc.total, 0) };
}
export function locked(date: string, snapshots: Snapshot[]) {
  return snapshots.some((s) => inPeriod(date, s));
}
export function confirmPeriod(data: Data, period: Period, now: string): Snapshot {
  return { ...period, total: summarize(data.entries, data.rules, period).total, confirmedAt: now };
}
export function difference(snapshot: Snapshot, rules: Rule[], entries: Entry[]) {
  return summarize(entries, rules, snapshot).total - snapshot.total;
}
