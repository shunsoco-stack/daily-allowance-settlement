"use client";
import { useState } from "react";
import Link from "next/link";
import { useData } from "./provider";
import { Heading, EntryTable, Field } from "./common";
import { periodFor } from "@/lib/dates";
export function Entries() {
  const { data, today } = useData();
  const period = periodFor(today, data.closing);
  const [from, setFrom] = useState(period.start);
  const [to, setTo] = useState(period.end);
  const [site, setSite] = useState("");
  const entries = data.entries
    .filter(
      (e) =>
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        (!site || e.works.some((w) => w.siteId === site)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <Heading
        eyebrow="WORK RECORDS"
        title="作業記録"
        description="その日の作業と移動を記録。手当の根拠まで、ひと目で。"
      >
        <Link className="button primary" href="/entries/new">
          ＋ 記録を追加
        </Link>
      </Heading>
      <section className="panel">
        <div className="filters">
          <Field label="期間の開始">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="期間の終了">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="現場">
            <select value={site} onChange={(e) => setSite(e.target.value)}>
              <option value="">すべての現場</option>
              {data.sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            全期間
          </button>
        </div>
        <p className="muted">{entries.length}件の記録</p>
        <EntryTable entries={entries} data={data} />
      </section>
    </>
  );
}
