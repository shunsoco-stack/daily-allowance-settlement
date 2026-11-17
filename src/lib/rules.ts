import type { Entry, Rule } from "./types";
export function ruleFor(date: string, rules: Rule[]) {
  return rules
    .filter((rule) => rule.effective <= date)
    .sort((a, b) => b.effective.localeCompare(a.effective))[0];
}
export function canRemoveRule(id: string, rules: Rule[], entries: Entry[]) {
  const remaining = rules.filter((rule) => rule.id !== id);
  return remaining.length > 0 && entries.every((entry) => ruleFor(entry.date, remaining));
}
export const money = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
