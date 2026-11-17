import { validDate } from "./dates";
import { interval } from "./time";
import { ruleFor } from "./rules";
import { seed } from "./seed";
import type { Data, Entry, Rule, Site, Work } from "./types";
export const STORAGE_KEY = "das:v1";
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const nonnegative = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const text = (v: unknown): v is string => typeof v === "string";
const time = (v: unknown) => text(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const date = (v: unknown) => text(v) && validDate(v);
const transport = (v: unknown) => ["public", "car", "company", "walk"].includes(String(v));
const unique = (items: { id: string }[]) => new Set(items.map((i) => i.id)).size === items.length;
export function validSite(v: unknown): v is Site {
  return (
    object(v) &&
    text(v.id) &&
    text(v.name) &&
    !!v.name.trim() &&
    nonnegative(v.km) &&
    transport(v.transport) &&
    typeof v.far === "boolean" &&
    text(v.memo)
  );
}
export function validRule(v: unknown): v is Rule {
  if (!object(v)) return false;
  const numeric = [
    "near",
    "far",
    "overnight",
    "farKm",
    "halfHours",
    "halfPercent",
    "overtimeHours",
    "overtimeRate",
    "nightRate",
    "earlyAmount",
    "holidayAmount",
    "lodging",
    "mealHours",
    "mealAmount",
    "carAbove",
    "walk",
    "parkingCap",
    "tollCap",
    "dailyCap",
  ];
  return (
    text(v.id) &&
    text(v.name) &&
    !!v.name.trim() &&
    date(v.effective) &&
    numeric.every((key) => nonnegative(v[key])) &&
    Number(v.halfPercent) <= 100 &&
    typeof v.unit === "number" &&
    [1, 15, 30].includes(v.unit) &&
    ["floor", "ceil", "round"].includes(String(v.rounding)) &&
    time(v.nightStart) &&
    time(v.nightEnd) &&
    time(v.earlyTime) &&
    Array.isArray(v.holidays) &&
    v.holidays.every(date) &&
    Array.isArray(v.special) &&
    v.special.every(
      (s) => object(s) && text(s.id) && text(s.name) && !!s.name.trim() && nonnegative(s.amount),
    ) &&
    unique(v.special) &&
    Array.isArray(v.distances) &&
    v.distances.length > 0 &&
    v.distances.every((b) => object(b) && nonnegative(b.max) && nonnegative(b.amount)) &&
    new Set(v.distances.map((b) => b.max)).size === v.distances.length
  );
}
export function validWork(v: unknown): v is Work {
  return (
    object(v) &&
    text(v.siteId) &&
    time(v.start) &&
    time(v.end) &&
    ["km", "breakMinutes", "fare", "parking", "toll"].every((k) => nonnegative(v[k])) &&
    transport(v.transport) &&
    typeof v.far === "boolean" &&
    typeof v.roundTrip === "boolean" &&
    interval(v as Work).duration > Number(v.breakMinutes)
  );
}
export function validEntry(v: unknown): v is Entry {
  if (
    !object(v) ||
    !text(v.id) ||
    !date(v.date) ||
    !Array.isArray(v.works) ||
    !v.works.length ||
    !v.works.every(validWork) ||
    typeof v.lodging !== "boolean" ||
    !Array.isArray(v.specials) ||
    !v.specials.every(text) ||
    !text(v.memo)
  )
    return false;
  const ranges = v.works.map(interval).sort((a, b) => a.start - b.start);
  return ranges.every((r, i) => i === 0 || r.start >= ranges[i - 1].end);
}
export function validateData(v: unknown): v is Data {
  if (
    !object(v) ||
    v.version !== 1 ||
    typeof v.closing !== "number" ||
    ![0, 15, 20, 25].includes(v.closing) ||
    !Array.isArray(v.rules) ||
    !v.rules.length ||
    !v.rules.every(validRule) ||
    !unique(v.rules) ||
    new Set(v.rules.map((r) => r.effective)).size !== v.rules.length ||
    !Array.isArray(v.sites) ||
    !v.sites.length ||
    !v.sites.every(validSite) ||
    !unique(v.sites) ||
    !Array.isArray(v.entries) ||
    !v.entries.every(validEntry) ||
    !unique(v.entries) ||
    new Set(v.entries.map((e) => e.date)).size !== v.entries.length ||
    !Array.isArray(v.snapshots) ||
    !v.snapshots.every(
      (s) =>
        object(s) &&
        date(s.start) &&
        date(s.end) &&
        String(s.start) <= String(s.end) &&
        nonnegative(s.total) &&
        text(s.confirmedAt),
    ) ||
    !Array.isArray(v.patterns) ||
    !v.patterns.every((p) => object(p) && text(p.name) && validEntry(p.entry))
  )
    return false;
  return (
    v.entries.every(
      (e) =>
        ruleFor(e.date, v.rules as Rule[]) &&
        e.works.every((w: Work) => (v.sites as Site[]).some((s) => s.id === w.siteId)),
    ) &&
    v.patterns.every((p) =>
      p.entry.works.every((w: Work) => (v.sites as Site[]).some((s) => s.id === w.siteId)),
    )
  );
}
export function restore(raw: string | null, now: Date): { data: Data; recovered: boolean } {
  if (raw === null) return { data: seed(now), recovered: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validateData(parsed)) return { data: parsed, recovered: false };
  } catch {
    /* 不正なJSONも既定データへ復元する。 */
  }
  return { data: seed(now), recovered: true };
}
