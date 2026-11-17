"use client";
import { useState } from "react";
import { useData } from "./provider";
import { Heading, Field } from "./common";
import { RuleFields } from "./rule-fields";
import { canRemoveRule, ruleFor, money } from "@/lib/rules";
import { addDays } from "@/lib/dates";
import { validRule } from "@/lib/storage";
import type { Rule } from "@/lib/types";
export function RulesView() {
  const { data, today, update } = useData();
  const [draft, setDraft] = useState<Rule | null>(null);
  const [error, setError] = useState("");
  const active = ruleFor(today, data.rules);
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !validRule(draft)) {
      setError("入力値を確認してください。距離区分は重複できません。");
      return;
    }
    const rules = [...data.rules.filter((r) => r.id !== draft.id), draft];
    if (
      new Set(rules.map((r) => r.effective)).size !== rules.length ||
      data.entries.some((e) => !ruleFor(e.date, rules))
    ) {
      setError("適用開始日の重複、または適用規程のなくなる記録があります。");
      return;
    }
    if (update({ ...data, rules })) {
      setDraft(null);
      setError("");
    }
  }
  return (
    <>
      <Heading
        eyebrow="ALLOWANCE RULES"
        title="規程設定"
        description="日ごとの適用規程で、金額の根拠を明確に。"
      />
      <div className="info-strip">
        規程の変更は過去の記録も再計算します。確定時点の合計は保持され、精算集計に差額が表示されます。
      </div>
      <div className="rules-cards">
        {[...data.rules]
          .sort((a, b) => b.effective.localeCompare(a.effective))
          .map((rule) => (
            <section className="panel" key={rule.id}>
              <div className="section-heading">
                <h2>{rule.name}</h2>
                <span className="badge">
                  {active?.id === rule.id
                    ? "現在適用中"
                    : rule.effective > today
                      ? "適用予定"
                      : "旧規程"}
                </span>
              </div>
              <p>{rule.effective} から適用</p>
              <div className="list-row">
                <span>近距離 / 遠方</span>
                <b>
                  {money(rule.near)} / {money(rule.far)}
                </b>
              </div>
              <div className="actions">
                <button
                  onClick={() => {
                    setDraft(structuredClone(rule));
                    setError("");
                  }}
                >
                  編集
                </button>
                <button
                  onClick={() => {
                    let effective = today;
                    while (data.rules.some((r) => r.effective === effective))
                      effective = addDays(effective, 1);
                    setDraft({
                      ...structuredClone(rule),
                      id: crypto.randomUUID(),
                      name: `${rule.name} の改定`,
                      effective,
                    });
                    setError("");
                  }}
                >
                  複製して新バージョン
                </button>
                <button
                  className="danger"
                  disabled={!canRemoveRule(rule.id, data.rules, data.entries)}
                  onClick={() => {
                    if (window.confirm("この規程を削除しますか？記録は残る規程で再計算されます。"))
                      update({ ...data, rules: data.rules.filter((r) => r.id !== rule.id) });
                  }}
                >
                  削除
                </button>
              </div>
            </section>
          ))}
      </div>
      <p className="muted">
        最後の規程、および削除すると適用規程のない記録が生じる規程は削除できません。
      </p>
      {draft && (
        <form className="panel" onSubmit={save}>
          <div className="section-heading">
            <h2>規程の編集</h2>
            <button type="button" onClick={() => setDraft(null)}>
              閉じる
            </button>
          </div>
          <div className="form-grid">
            <Field label="規程名">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="適用開始日">
              <input
                type="date"
                required
                value={draft.effective}
                onChange={(e) => setDraft({ ...draft, effective: e.target.value })}
              />
            </Field>
          </div>
          <RuleFields rule={draft} change={setDraft} />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" type="submit">
            規程を保存
          </button>
        </form>
      )}
    </>
  );
}
