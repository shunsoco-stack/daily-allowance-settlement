import { summarize } from "./summary";
import type { Data, Period } from "./types";
export function csvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === "string" && /^[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvFilename(period: Period, aggregate = false) {
  return `精算${aggregate ? "_項目別" : ""}_${period.start}_${period.end}.csv`;
}
export function makeCsv(data: Data, period: Period, aggregate = false) {
  const summary = summarize(data.entries, data.rules, period);
  const rows: (string | number)[][] = aggregate
    ? [["項目", "金額"], ...Object.entries(summary.totals), ["合計", summary.total]]
    : [
        ["日付", "現場", "規程", "項目", "根拠", "金額"],
        ...summary.rows.flatMap(({ entry, calc }) =>
          calc.lines.map((line) => [
            entry.date,
            entry.works
              .map((w) => data.sites.find((s) => s.id === w.siteId)?.name ?? "削除済み現場")
              .join(" / "),
            calc.rule?.name ?? "適用規程なし",
            line.category,
            line.reason,
            line.amount,
          ]),
        ),
      ];
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function downloadCsv(data: Data, period: Period, aggregate = false) {
  const url = URL.createObjectURL(
    new Blob([makeCsv(data, period, aggregate)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = csvFilename(period, aggregate);
  anchor.click();
  URL.revokeObjectURL(url);
}
