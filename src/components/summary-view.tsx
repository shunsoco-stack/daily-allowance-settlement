"use client";
import { useState } from "react";
import { useData } from "./provider";
import { Heading, EntryTable, Field } from "./common";
import { addDays, periodFor, previousPeriod } from "@/lib/dates";
import { confirmPeriod, difference, summarize } from "@/lib/summary";
import { money } from "@/lib/rules";
import { downloadCsv } from "@/lib/csv";
import type { Closing } from "@/lib/types";
export function SummaryView() {
  const { data, today, update } = useData();
  const [anchor, setAnchor] = useState(today);
  const period = periodFor(anchor, data.closing);
  const result = summarize(data.entries, data.rules, period);
  const previous = summarize(data.entries, data.rules, previousPeriod(period, data.closing));
  const snapshot = data.snapshots.find((s) => s.start === period.start && s.end === period.end);
  const overlap = data.snapshots.some((s) => s.start <= period.end && s.end >= period.start);
  return (
    <>
      <Heading
        eyebrow="SETTLEMENT"
        title="精算集計"
        description="締め日に合わせて、日々の記録をまとめる。"
      >
        <button onClick={() => window.print()}>▧ 精算書を印刷</button>
      </Heading>
      <section className="panel">
        <div className="filters no-print">
          <Field label="締め日">
            <select
              value={data.closing}
              disabled={data.snapshots.length > 0}
              onChange={(e) => update({ ...data, closing: Number(e.target.value) as Closing })}
            >
              {[0, 15, 20, 25].map((n) => (
                <option key={n} value={n}>
                  {n || "末"}日
                </option>
              ))}
            </select>
          </Field>
          <Field label="この日を含む精算期間">
            <input
              type="date"
              value={anchor}
              onChange={(e) => {
                if (e.target.value) setAnchor(e.target.value);
              }}
            />
          </Field>
          <button onClick={() => setAnchor(addDays(period.start, -1))}>← 前期</button>
          <button onClick={() => setAnchor(today)}>今期</button>
          <button onClick={() => setAnchor(addDays(period.end, 1))}>次期 →</button>
        </div>
        {data.snapshots.length > 0 && (
          <p className="muted no-print">締め日を変更する場合は、すべての確定を解除してください。</p>
        )}
        <div className="section-heading">
          <div>
            <p className="eyebrow">精算書 · {snapshot ? "確定済み" : "未確定"}</p>
            <h2>
              {period.start} 〜 {period.end}
            </h2>
          </div>
          <strong className="summary-amount">{money(result.total)}</strong>
        </div>
        <p className="muted">
          {result.rows.length}作業日 · 前期比 {money(result.total - previous.total)}（前期{" "}
          {money(previous.total)}）
        </p>
        {snapshot && (
          <div className="info-strip">
            確定時 {money(snapshot.total)} / 現在の再計算との差額{" "}
            <b>{money(difference(snapshot, data.rules, data.entries))}</b>
          </div>
        )}
        <div className="category-grid">
          {Object.entries(result.totals).map(([name, amount]) => (
            <div className="category-item" key={name}>
              <span>{name}</span>
              <strong>{money(amount)}</strong>
            </div>
          ))}
        </div>
        <div className="actions no-print">
          <button onClick={() => downloadCsv(data, period)}>↓ 日別明細CSV</button>
          <button onClick={() => downloadCsv(data, period, true)}>↓ 項目別集計CSV</button>
          <button
            className="primary"
            disabled={!snapshot && overlap}
            onClick={() => {
              if (snapshot) {
                if (window.confirm("確定を解除して記録を編集可能にしますか？"))
                  update({ ...data, snapshots: data.snapshots.filter((s) => s !== snapshot) });
              } else {
                update({
                  ...data,
                  snapshots: [
                    ...data.snapshots,
                    confirmPeriod(data, period, new Date().toISOString()),
                  ],
                });
              }
            }}
          >
            {snapshot ? "確定を解除" : "この期間を確定"}
          </button>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <h2>現場別合計</h2>
          <p className="muted">複数現場の日は実働時間比で配分（端数は最後の現場）。</p>
          {Object.entries(result.sites).map(([id, amount]) => (
            <div className="list-row" key={id}>
              <span>{data.sites.find((s) => s.id === id)?.name}</span>
              <b>{money(amount)}</b>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>週次合計</h2>
          <p className="muted">月曜始まり・選択した精算期間内の記録のみ</p>
          {Object.entries(result.weeks)
            .sort()
            .map(([date, amount]) => (
              <div className="list-row" key={date}>
                <span>
                  {date.slice(5)} 〜 {addDays(date, 6).slice(5)}
                </span>
                <b>{money(amount)}</b>
              </div>
            ))}
        </section>
      </div>
      <section className="panel">
        <h2>日別明細</h2>
        <EntryTable data={data} entries={result.rows.map((r) => r.entry)} />
      </section>
      <p className="print-note">
        デモ用の架空データです。給与計算ではありません。規程変更後の出力は現在の再計算額です。
      </p>
      {data.snapshots.length > 0 && (
        <section className="panel no-print">
          <h2>確定済み期間</h2>
          {data.snapshots.map((s) => (
            <div className="list-row" key={s.start}>
              <button onClick={() => setAnchor(s.end)}>
                {s.start} 〜 {s.end}
              </button>
              <span>
                {money(s.total)} · 差額 {money(difference(s, data.rules, data.entries))}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
