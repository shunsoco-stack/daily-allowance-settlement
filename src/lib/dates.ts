import type { Closing, Period } from "./types";

export function japanNow(now: Date) {
  const local = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
export function monthEnd(year: number, month: number, closing: Closing) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, closing || last)).toISOString().slice(0, 10);
}
export function periodFor(date: string, closing: Closing): Period {
  const d = new Date(`${date}T00:00:00Z`);
  const y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  if (date > monthEnd(y, m, closing)) m += 1;
  return { start: addDays(monthEnd(y, m - 1, closing), 1), end: monthEnd(y, m, closing) };
}
export function previousPeriod(period: Period, closing: Closing) {
  return periodFor(addDays(period.start, -1), closing);
}
export function weekFor(date: string): Period {
  const start = addDays(date, -((weekday(date) + 6) % 7));
  return { start, end: addDays(start, 6) };
}
export function inPeriod(date: string, period: Period) {
  return date >= period.start && date <= period.end;
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
