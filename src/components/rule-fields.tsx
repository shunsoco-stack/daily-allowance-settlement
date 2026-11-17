import { Field } from "./common";
import type { Rule } from "@/lib/types";
const groups: { title: string; fields: [keyof Rule, string][] }[] = [
  {
    title: "日当・半日判定",
    fields: [
      ["near", "近距離現場（円）"],
      ["far", "遠方現場（円）"],
      ["overnight", "宿泊出張の日当（円）"],
      ["farKm", "遠方の基準・片道（km以上）"],
      ["halfHours", "半日の基準（実働時間未満）"],
      ["halfPercent", "半日の支給率（%）"],
    ],
  },
  {
    title: "時間外・深夜・早出",
    fields: [
      ["overtimeHours", "時間外の基準（実働時間超）"],
      ["overtimeRate", "時間外単価（円/時間）"],
      ["nightRate", "深夜単価（円/時間）"],
      ["earlyAmount", "早出手当（円/日）"],
    ],
  },
  {
    title: "休日・宿泊・食事",
    fields: [
      ["holidayAmount", "休日手当（円/日）"],
      ["lodging", "宿泊手当（円/泊）"],
      ["mealHours", "食事の基準（拘束時間以上）"],
      ["mealAmount", "食事手当（円/日）"],
    ],
  },
  {
    title: "交通費・上限",
    fields: [
      ["carAbove", "自家用車・最長距離区分超（円/片道）"],
      ["walk", "徒歩・自転車（円/現場）"],
      ["parkingCap", "駐車場実費の上限（円/日）"],
      ["tollCap", "高速実費の上限（円/日）"],
      ["dailyCap", "1日の総額上限（円・0は上限なし）"],
    ],
  },
];
export function RuleFields({ rule, change }: { rule: Rule; change: (rule: Rule) => void }) {
  return (
    <>
      {groups.map((group) => (
        <section className="form-section" key={group.title}>
          <h3>{group.title}</h3>
          <div className="form-grid">
            {group.fields.map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  max={key === "halfPercent" ? 100 : undefined}
                  required
                  value={Number(rule[key])}
                  onChange={(e) => change({ ...rule, [key]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
        </section>
      ))}
      <section className="form-section">
        <h3>時刻・端数ルール</h3>
        <div className="form-grid">
          {(
            [
              ["nightStart", "深夜帯の開始"],
              ["nightEnd", "深夜帯の終了"],
              ["earlyTime", "早出の基準（この時刻より前）"],
            ] as const
          ).map(([key, label]) => (
            <Field label={label} key={key}>
              <input
                type="time"
                required
                value={rule[key]}
                onChange={(e) => change({ ...rule, [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="時間外の丸め単位">
            <select
              value={rule.unit}
              onChange={(e) => change({ ...rule, unit: Number(e.target.value) as Rule["unit"] })}
            >
              {[1, 15, 30].map((n) => (
                <option value={n} key={n}>
                  {n}分
                </option>
              ))}
            </select>
          </Field>
          <Field label="時間外の端数処理">
            <select
              value={rule.rounding}
              onChange={(e) => change({ ...rule, rounding: e.target.value as Rule["rounding"] })}
            >
              <option value="floor">切り捨て</option>
              <option value="ceil">切り上げ</option>
              <option value="round">四捨五入</option>
            </select>
          </Field>
        </div>
      </section>
      <section className="form-section">
        <h3>指定休日</h3>
        <p className="muted">土日は自動判定。祝日の自動判定はしません。</p>
        {rule.holidays.map((date, i) => (
          <div className="actions" key={i}>
            <input
              aria-label={`指定休日${i + 1}`}
              type="date"
              required
              value={date}
              onChange={(e) =>
                change({
                  ...rule,
                  holidays: rule.holidays.map((v, j) => (i === j ? e.target.value : v)),
                })
              }
            />
            <button
              type="button"
              onClick={() => change({ ...rule, holidays: rule.holidays.filter((_, j) => i !== j) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => change({ ...rule, holidays: [...rule.holidays, rule.effective] })}
        >
          ＋ 指定休日を追加
        </button>
      </section>
      <section className="form-section">
        <h3>特殊作業手当</h3>
        {rule.special.map((special, i) => (
          <div className="editable-row" key={special.id}>
            <Field label="作業名">
              <input
                required
                value={special.name}
                onChange={(e) =>
                  change({
                    ...rule,
                    special: rule.special.map((s, j) =>
                      i === j ? { ...s, name: e.target.value } : s,
                    ),
                  })
                }
              />
            </Field>
            <Field label="1日あたり（円）">
              <input
                type="number"
                min="0"
                required
                value={special.amount}
                onChange={(e) =>
                  change({
                    ...rule,
                    special: rule.special.map((s, j) =>
                      i === j ? { ...s, amount: Number(e.target.value) } : s,
                    ),
                  })
                }
              />
            </Field>
            <button
              type="button"
              onClick={() => change({ ...rule, special: rule.special.filter((_, j) => i !== j) })}
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            change({
              ...rule,
              special: [
                ...rule.special,
                { id: crypto.randomUUID(), name: "追加作業", amount: 500 },
              ],
            })
          }
        >
          ＋ 特殊作業を追加
        </button>
      </section>
      <section className="form-section">
        <h3>自家用車の距離区分</h3>
        <p className="muted">
          片道距離に該当する最小の区分を適用。往復は2倍。公共交通は入力実費、会社車両は0円です。
        </p>
        {rule.distances.map((band, i) => (
          <div className="editable-row" key={i}>
            <Field label="片道距離の上限（km以下）">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={band.max}
                onChange={(e) =>
                  change({
                    ...rule,
                    distances: rule.distances.map((b, j) =>
                      i === j ? { ...b, max: Number(e.target.value) } : b,
                    ),
                  })
                }
              />
            </Field>
            <Field label="片道の定額（円）">
              <input
                type="number"
                min="0"
                required
                value={band.amount}
                onChange={(e) =>
                  change({
                    ...rule,
                    distances: rule.distances.map((b, j) =>
                      i === j ? { ...b, amount: Number(e.target.value) } : b,
                    ),
                  })
                }
              />
            </Field>
            <button
              type="button"
              disabled={rule.distances.length === 1}
              onClick={() =>
                change({ ...rule, distances: rule.distances.filter((_, j) => i !== j) })
              }
            >
              削除
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            change({
              ...rule,
              distances: [
                ...rule.distances,
                { max: Math.max(...rule.distances.map((b) => b.max)) + 30, amount: 2000 },
              ],
            })
          }
        >
          ＋ 距離区分を追加
        </button>
      </section>
    </>
  );
}
