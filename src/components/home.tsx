"use client";
import Link from "next/link";
import { useData } from "./provider";
import { Heading, EntryTable } from "./common";
import { periodFor, previousPeriod, weekFor } from "@/lib/dates";
import { summarize } from "@/lib/summary";
import { money, ruleFor } from "@/lib/rules";
export function Home() {
  const { data, today } = useData();
  const period = periodFor(today, data.closing);
  const current = summarize(data.entries, data.rules, period);
  const previous = summarize(data.entries, data.rules, previousPeriod(period, data.closing));
  const week = summarize(data.entries, data.rules, weekFor(today));
  const rule = ruleFor(today, data.rules);
  const items = Object.entries(current.totals).filter(([name]) => name !== "上限調整");
  const highestDailyTotal = Math.max(1, ...current.rows.map((row) => row.calc.total));
  return (
    <>
      <Heading
        eyebrow="OVERVIEW"
        title="今日も、おつかれさまです。"
        description={`${today.replaceAll("-", "/")} · 日々の作業と手当を、ひとつに。`}
      >
        <Link className="button primary" href="/entries/new">
          ＋ 今日の記録を追加
        </Link>
      </Heading>
      <div className="period-caption">
        <span>
          <i className="dot" /> 今期の精算状況
        </span>
        <span>
          {period.start.replaceAll("-", "/")} — {period.end.replaceAll("-", "/")}
          <b className="badge">{data.closing || "末"}日締め</b>
        </span>
      </div>
      <div className="stats-grid">
        <section className="total-card">
          <span>今期の精算合計</span>
          <strong>{money(current.total)}</strong>
          <div>
            <span className="delta">
              {current.total - previous.total >= 0 ? "＋" : ""}
              {money(current.total - previous.total)}
            </span>
            <small>前期合計との比較</small>
          </div>
          <div className="total-decoration" aria-hidden="true">
            ¥
          </div>
        </section>
        <section className="stat-card">
          <span>記録した作業日</span>
          <strong>
            {current.rows.length}
            <small>日</small>
          </strong>
          <p>
            今期の現場数 <b>{Object.keys(current.sites).length}現場</b>
          </p>
          <div className="mini-bars" aria-label="直近12記録の精算額">
            {current.rows
              .slice(0, 12)
              .reverse()
              .map(({ entry, calc }) => (
                <i
                  key={entry.id}
                  title={`${entry.date}: ${money(calc.total)}`}
                  style={{
                    height: `${(calc.total / highestDailyTotal) * 100}%`,
                  }}
                />
              ))}
          </div>
        </section>
        <section className="stat-card">
          <span>今週の精算合計</span>
          <strong>{money(week.total)}</strong>
          <p>
            {weekFor(today).start.slice(5)} 〜 {weekFor(today).end.slice(5)} · 月曜始まり
          </p>
          <Link href="/summary" className="text-link">
            週次の内訳を見る →
          </Link>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>項目別の内訳</h2>
            <span className="muted">今期</span>
          </div>
          <div className="category-grid">
            {items.map(([name, amount], i) => (
              <div key={name} className="category-item">
                <span>
                  <i style={{ background: `var(--chart-${i % 4})` }} />
                  {name}
                </span>
                <strong>{money(amount)}</strong>
              </div>
            ))}
          </div>
          <div className="stack-bar">
            {items
              .filter(([, amount]) => amount > 0)
              .map(([name, amount], i) => (
                <span key={name} style={{ flex: amount, background: `var(--chart-${i % 4})` }} />
              ))}
          </div>
          {current.totals.上限調整 !== 0 && <p>上限調整 {money(current.totals.上限調整)}</p>}
        </section>
        <section className="panel rule-note">
          <span className="note-icon">▧</span>
          <h2>規程に沿って、自動で計算。</h2>
          <p>
            作業時間と移動の記録から、
            <br />
            日当・手当・交通費を算出します。
          </p>
          <div>
            <small>現在適用中の規程</small>
            <strong>{rule?.name}</strong>
            <small>{rule?.effective} から適用</small>
          </div>
          <Link className="text-link" href="/rules">
            規程と単価を確認する →
          </Link>
        </section>
      </div>
      <section className="panel recent">
        <div className="section-heading">
          <div>
            <h2>直近の作業記録</h2>
            <p className="muted">記録を選ぶと、金額の根拠を確認できます。</p>
          </div>
          <Link className="text-link" href="/entries">
            すべての記録 →
          </Link>
        </div>
        <EntryTable
          data={data}
          entries={[...data.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)}
        />
      </section>
      <div className="info-strip">
        <span>ⓘ</span>
        <p>データはこのブラウザに保存されます。精算集計からCSV出力・印刷ができます。</p>
        <Link href="/about">詳しく見る →</Link>
      </div>
    </>
  );
}
