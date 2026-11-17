import { weekday } from "./dates";
import { ruleFor, money } from "./rules";
import { durationText, interval, minutes, nightMinutes, roundedMinutes, workMinutes } from "./time";
import type { Calculation, Category, Entry, Line, Rule, Work } from "./types";

export function transportCost(work: Work, rule: Rule) {
  if (work.transport === "public") return { amount: work.fare, reason: "公共交通の入力実費" };
  if (work.transport === "company") return { amount: 0, reason: "会社車両（支給なし）" };
  if (work.transport === "walk") return { amount: rule.walk, reason: "徒歩・自転車の定額" };
  const band = [...rule.distances].sort((a, b) => a.max - b.max).find((b) => work.km <= b.max);
  const rate = band?.amount ?? rule.carAbove;
  const bandName = band ? `${band.max}km以下` : "最長区分超";
  const trips = work.roundTrip ? "往復2回" : "片道1回";
  return {
    amount: rate * (work.roundTrip ? 2 : 1),
    reason: `片道${work.km}km → ${bandName} ${money(rate)} × ${trips}`,
  };
}
export function calculate(entry: Entry, rules: Rule[]): Calculation {
  const rule = ruleFor(entry.date, rules);
  const totalMinutes = entry.works.reduce((sum, w) => sum + workMinutes(w), 0);
  if (!rule) return { lines: [], total: 0, minutes: totalMinutes };
  const lines: Line[] = [];
  const add = (category: Category, amount: number, reason: string) => {
    lines.push({ category, amount: Math.round(amount), reason });
  };
  const distance = Math.max(0, ...entry.works.map((w) => w.km));
  const far = distance >= rule.farKm || entry.works.some((w) => w.far);
  const base = entry.lodging ? rule.overnight : far ? rule.far : rule.near;
  const half = totalMinutes < rule.halfHours * 60;
  const category = entry.lodging
    ? "宿泊を伴う出張"
    : `片道最大${distance}km・${far ? "遠方" : "近距離"}現場`;
  const halfReason = half
    ? ` × 半日${rule.halfPercent}%（実働${rule.halfHours}時間未満）`
    : "（1日分）";
  add(
    "日当",
    base * (half ? rule.halfPercent / 100 : 1),
    `${category} → ${money(base)}${halfReason}`,
  );
  const overtime = roundedMinutes(
    Math.max(0, totalMinutes - rule.overtimeHours * 60),
    rule.unit,
    rule.rounding,
  );
  add(
    "時間外",
    (overtime / 60) * rule.overtimeRate,
    `${durationText(overtime)} × ${money(rule.overtimeRate)}/時間（${rule.unit}分単位）`,
  );
  const night = entry.works.reduce((sum, w) => sum + nightMinutes(w, rule), 0);
  add(
    "深夜",
    (night / 60) * rule.nightRate,
    `${durationText(night)} × ${money(rule.nightRate)}/時間（休憩を比例配分）`,
  );
  const early = entry.works.some((w) => minutes(w.start) < minutes(rule.earlyTime));
  add(
    "早出",
    early ? rule.earlyAmount : 0,
    `${rule.earlyTime}より前の開始${early ? "あり" : "なし"}`,
  );
  const holiday = [0, 6].includes(weekday(entry.date)) || rule.holidays.includes(entry.date);
  add(
    "休日",
    holiday ? rule.holidayAmount : 0,
    holiday ? "開始日が土日または指定休日" : "開始日は平日",
  );
  for (const special of rule.special.filter((s) => entry.specials.includes(s.id))) {
    add("特殊", special.amount, `${special.name}・1日分`);
  }
  add("宿泊", entry.lodging ? rule.lodging : 0, entry.lodging ? "宿泊1泊分" : "宿泊なし");
  const bounds = entry.works.map(interval);
  const span = Math.max(...bounds.map((b) => b.end)) - Math.min(...bounds.map((b) => b.start));
  add(
    "食事",
    span >= rule.mealHours * 60 ? rule.mealAmount : 0,
    `拘束${durationText(span)} / 支給基準${rule.mealHours}時間以上`,
  );
  for (const work of entry.works) {
    const transport = transportCost(work, rule);
    add("交通費", transport.amount, transport.reason);
  }
  const parking = entry.works.reduce((sum, w) => sum + w.parking, 0);
  const toll = entry.works.reduce((sum, w) => sum + w.toll, 0);
  add(
    "交通費",
    Math.min(parking, rule.parkingCap),
    `駐車場実費${money(parking)}・日額上限${money(rule.parkingCap)}`,
  );
  add(
    "交通費",
    Math.min(toll, rule.tollCap),
    `高速実費${money(toll)}・日額上限${money(rule.tollCap)}`,
  );
  let total = lines.reduce((sum, line) => sum + line.amount, 0);
  if (rule.dailyCap > 0 && total > rule.dailyCap) {
    add("上限調整", rule.dailyCap - total, `1日上限${money(rule.dailyCap)}を適用`);
    total = rule.dailyCap;
  }
  return { rule, lines, total, minutes: totalMinutes };
}
