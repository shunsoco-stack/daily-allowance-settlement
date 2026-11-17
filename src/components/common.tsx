import Link from "next/link";
import { cloneElement, isValidElement, type ReactElement } from "react";
import { money } from "@/lib/rules";
import type { Calculation, Data, Entry } from "@/lib/types";
import { calculate } from "@/lib/calc";
import { locked } from "@/lib/summary";
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="actions no-print">{children}</div>
    </div>
  );
}
export function Breakdown({ calc }: { calc: Calculation }) {
  return (
    <section className="panel breakdown">
      <div className="section-heading">
        <h2>金額の内訳</h2>
        <span className="badge">自動計算</span>
      </div>
      <p className="muted">
        {calc.rule
          ? `${calc.rule.name} / ${calc.rule.effective}〜`
          : "この日に適用できる規程がありません"}
      </p>
      {calc.lines.map((line, i) => (
        <div className="breakdown-row" key={i}>
          <div>
            <strong>{line.category}</strong>
            <small>{line.reason}</small>
          </div>
          <b>{money(line.amount)}</b>
        </div>
      ))}
      <div className="breakdown-total">
        <span>精算合計</span>
        <strong>{money(calc.total)}</strong>
      </div>
      <small>円未満は項目ごとに四捨五入。上限調整の行がなければ日額上限の適用はありません。</small>
    </section>
  );
}
export function EntryTable({ entries, data }: { entries: Entry[]; data: Data }) {
  if (!entries.length)
    return <div className="empty">この期間の記録はありません。作業記録を追加しましょう。</div>;
  return (
    <div className="entry-table">
      <div className="table-head">
        <span>作業日 / 現場</span>
        <span>作業時間</span>
        <span>精算額</span>
        <span>状態</span>
      </div>
      {entries.map((entry) => (
        <Link className="entry-row" href={`/entries/${entry.id}`} key={entry.id}>
          <div>
            <strong>{entry.date.slice(5).replace("-", "/")}</strong>
            <span>
              {entry.works.map((w) => data.sites.find((s) => s.id === w.siteId)?.name).join(" / ")}
            </span>
          </div>
          <span className="entry-time">
            {entry.works[0].start} – {entry.works.at(-1)!.end}
            {entry.works.some((w) => w.end < w.start) && <small>翌日終了</small>}
          </span>
          <b>{money(calculate(entry, data.rules).total)}</b>
          <span className="badge">{locked(entry.date, data.snapshots) ? "確定済" : "未確定"}</span>
        </Link>
      ))}
    </div>
  );
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-label": string }>, { "aria-label": label })
        : children}
    </label>
  );
}
