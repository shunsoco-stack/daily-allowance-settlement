export type Transport = "public" | "car" | "company" | "walk";
export type Closing = 0 | 15 | 20 | 25;
export type Rule = {
  id: string;
  name: string;
  effective: string;
  near: number;
  far: number;
  overnight: number;
  farKm: number;
  halfHours: number;
  halfPercent: number;
  overtimeHours: number;
  overtimeRate: number;
  rounding: "floor" | "ceil" | "round";
  unit: 1 | 15 | 30;
  nightStart: string;
  nightEnd: string;
  nightRate: number;
  earlyTime: string;
  earlyAmount: number;
  holidayAmount: number;
  holidays: string[];
  special: { id: string; name: string; amount: number }[];
  lodging: number;
  mealHours: number;
  mealAmount: number;
  distances: { max: number; amount: number }[];
  carAbove: number;
  walk: number;
  parkingCap: number;
  tollCap: number;
  dailyCap: number;
};
export type Site = {
  id: string;
  name: string;
  km: number;
  transport: Transport;
  far: boolean;
  memo: string;
};
export type Work = {
  siteId: string;
  km: number;
  far: boolean;
  start: string;
  end: string;
  breakMinutes: number;
  transport: Transport;
  roundTrip: boolean;
  fare: number;
  parking: number;
  toll: number;
};
export type Entry = {
  id: string;
  date: string;
  works: Work[];
  lodging: boolean;
  specials: string[];
  memo: string;
};
export type Period = { start: string; end: string };
export type Snapshot = Period & { total: number; confirmedAt: string };
export type Data = {
  version: 1;
  closing: Closing;
  rules: Rule[];
  sites: Site[];
  entries: Entry[];
  snapshots: Snapshot[];
  patterns: { name: string; entry: Entry }[];
};
export const categories = [
  "日当",
  "時間外",
  "深夜",
  "早出",
  "休日",
  "特殊",
  "宿泊",
  "食事",
  "交通費",
  "上限調整",
] as const;
export type Category = (typeof categories)[number];
export type Line = { category: Category; amount: number; reason: string };
export type Calculation = { rule?: Rule; lines: Line[]; total: number; minutes: number };
