"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useData } from "./provider";
import { Heading, Breakdown, Field } from "./common";
import { WorkFields } from "./work-fields";
import { blankWork } from "@/lib/seed";
import { calculate } from "@/lib/calc";
import { addDays, validDate } from "@/lib/dates";
import { locked } from "@/lib/summary";
import { validEntry } from "@/lib/storage";
import type { Entry } from "@/lib/types";
export function EntryEditor({ id }: { id?: string }) {
  const { data, today, update } = useData();
  const existing = data.entries.find((entry) => entry.id === id);
  const [entry, setEntry] = useState<Entry>(
    existing ?? {
      id: "new",
      date: today,
      works: [blankWork(data.sites[0])],
      lodging: false,
      specials: [],
      memo: "",
    },
  );
  const [error, setError] = useState("");
  const router = useRouter();
  if (id && !existing)
    return (
      <section className="panel">
        <h1>記録が見つかりません</h1>
        <Link href="/entries">記録一覧へ戻る</Link>
      </section>
    );
  const isLocked =
    locked(entry.date, data.snapshots) || !!(existing && locked(existing.date, data.snapshots));
  const calc = calculate(entry, data.rules);
  function copy(source?: Entry) {
    if (!source) {
      setError("前日の記録がありません。");
      return;
    }
    setEntry({ ...structuredClone(source), id: entry.id, date: entry.date });
    setError("");
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (isLocked) return;
    if (!validEntry(entry) || !calc.rule) {
      setError("作業時間・休憩・時間の重複・適用規程を確認してください。実働は1分以上必要です。");
      return;
    }
    if (data.entries.some((e) => e.date === entry.date && e.id !== entry.id)) {
      setError("同じ日付の記録があります。既存の記録に現場を追加してください。");
      return;
    }
    const saved = { ...entry, id: existing?.id ?? crypto.randomUUID() };
    if (update({ ...data, entries: [...data.entries.filter((e) => e.id !== saved.id), saved] }))
      router.push(`/entries/${saved.id}`);
  }
  return (
    <>
      <Heading
        eyebrow="DAILY RECORD"
        title={id ? "作業記録の詳細" : "今日の記録を追加"}
        description="開始日の記録として集計します。終了が開始より前なら翌日扱いです。"
      >
        <Link className="button" href="/entries">
          一覧へ戻る
        </Link>
      </Heading>
      {isLocked && (
        <p className="notice">
          確定済み期間の記録です。編集するには精算集計で確定を解除してください。
        </p>
      )}
      <div className="editor-grid">
        <form onSubmit={save}>
          <fieldset disabled={isLocked}>
            <section className="panel">
              <h2>基本情報</h2>
              <Field label="作業日">
                <input
                  type="date"
                  required
                  value={entry.date}
                  onChange={(e) => setEntry({ ...entry, date: e.target.value })}
                />
              </Field>
              <div className="actions quick-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (!validDate(entry.date)) {
                      setError("先に作業日を入力してください。");
                      return;
                    }
                    copy(data.entries.find((e) => e.date === addDays(entry.date, -1)));
                  }}
                >
                  前日と同じ内容で入力
                </button>
                <select
                  aria-label="よく使うパターン"
                  value=""
                  onChange={(e) => copy(data.patterns[Number(e.target.value)].entry)}
                >
                  <option value="" disabled>
                    よく使うパターン
                  </option>
                  {data.patterns.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>
            {entry.works.map((work, index) => (
              <section className="panel" key={index}>
                <div className="section-heading">
                  <h2>現場 {String(index + 1).padStart(2, "0")}</h2>
                  {entry.works.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEntry({ ...entry, works: entry.works.filter((_, i) => i !== index) })
                      }
                    >
                      この現場を削除
                    </button>
                  )}
                </div>
                <WorkFields
                  sites={data.sites}
                  work={work}
                  onChange={(value) =>
                    setEntry({
                      ...entry,
                      works: entry.works.map((w, i) => (i === index ? value : w)),
                    })
                  }
                />
              </section>
            ))}
            <button
              type="button"
              className="wide"
              onClick={() =>
                setEntry({
                  ...entry,
                  works: [
                    ...entry.works,
                    { ...blankWork(data.sites[0]), start: "18:00", end: "20:00", breakMinutes: 0 },
                  ],
                })
              }
            >
              ＋ 同じ日の現場を追加
            </button>
            <section className="panel">
              <h2>追加の手当・メモ</h2>
              <label className="check">
                <input
                  type="checkbox"
                  checked={entry.lodging}
                  onChange={(e) => setEntry({ ...entry, lodging: e.target.checked })}
                />
                宿泊を伴う出張（1泊）
              </label>
              {calc.rule?.special.map((special) => (
                <label className="check" key={special.id}>
                  <input
                    type="checkbox"
                    checked={entry.specials.includes(special.id)}
                    onChange={(e) =>
                      setEntry({
                        ...entry,
                        specials: e.target.checked
                          ? [...entry.specials, special.id]
                          : entry.specials.filter((id) => id !== special.id),
                      })
                    }
                  />
                  {special.name}
                </label>
              ))}
              <Field label="メモ">
                <textarea
                  value={entry.memo}
                  onChange={(e) => setEntry({ ...entry, memo: e.target.value })}
                />
              </Field>
              <p className="muted">
                休憩は通常・深夜時間に比例配分します。複数現場の作業時間は重複できません。
              </p>
            </section>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="actions">
              <button className="primary" type="submit">
                記録を保存
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt("パターン名");
                  if (name?.trim() && validEntry(entry))
                    update({ ...data, patterns: [...data.patterns, { name: name.trim(), entry }] });
                }}
              >
                パターンとして保存
              </button>
              {existing && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (
                      window.confirm("この作業記録を削除しますか？") &&
                      update({ ...data, entries: data.entries.filter((e) => e.id !== id) })
                    )
                      router.push("/entries");
                  }}
                >
                  削除
                </button>
              )}
            </div>
          </fieldset>
        </form>
        <div>
          <Breakdown calc={calc} />
        </div>
      </div>
    </>
  );
}
