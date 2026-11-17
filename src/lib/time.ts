import type { Work, Rule } from "./types";

export function minutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}
export function interval(work: Pick<Work, "start" | "end">) {
  const start = minutes(work.start);
  let end = minutes(work.end);
  if (end < start) end += 1440;
  return { start, end, duration: end - start };
}
export function workMinutes(work: Work) {
  return Math.max(0, interval(work).duration - work.breakMinutes);
}
export function nightMinutes(work: Work, rule: Rule) {
  const { start, end, duration } = interval(work);
  const from = minutes(rule.nightStart);
  let to = minutes(rule.nightEnd);
  if (to <= from) to += 1440;
  let overlap = 0;
  for (const day of [-1440, 0, 1440]) {
    overlap += Math.max(0, Math.min(end, to + day) - Math.max(start, from + day));
  }
  return duration ? (overlap * workMinutes(work)) / duration : 0;
}
export function roundedMinutes(value: number, unit: number, rounding: Rule["rounding"]) {
  return Math[rounding](value / unit) * unit;
}
export function durationText(value: number) {
  const n = Math.round(value);
  return `${Math.floor(n / 60)}時間${n % 60}分`;
}
export function endTimestamp(date: string, work: Pick<Work, "start" | "end">) {
  return Date.parse(`${date}T00:00:00+09:00`) + interval(work).end * 60000;
}
