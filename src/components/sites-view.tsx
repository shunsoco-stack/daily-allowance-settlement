"use client";
import { useState } from "react";
import { useData } from "./provider";
import { Heading, Field } from "./common";
import { transportNames } from "./work-fields";
import { ruleFor } from "@/lib/rules";
import type { Site, Transport } from "@/lib/types";
export function SitesView() {
  const { data, today, update } = useData();
  const [draft, setDraft] = useState<Site | null>(null);
  const farKm = ruleFor(today, data.rules)?.farKm ?? 30;
  return (
    <>
      <Heading
        eyebrow="WORK SITES"
        title="現場マスタ"
        description="現場を選ぶだけで、距離と移動手段を自動入力。"
      >
        <button
          className="primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              km: 0,
              transport: "car",
              far: false,
              memo: "",
            })
          }
        >
          ＋ 現場を追加
        </button>
      </Heading>
      {draft && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (update({ ...data, sites: [...data.sites.filter((s) => s.id !== draft.id), draft] }))
              setDraft(null);
          }}
        >
          <h2>現場の編集</h2>
          <div className="form-grid">
            <Field label="現場名（架空）">
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="片道距離（km）">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={draft.km}
                onChange={(e) => setDraft({ ...draft, km: Number(e.target.value) })}
              />
            </Field>
            <Field label="既定の移動手段">
              <select
                value={draft.transport}
                onChange={(e) => setDraft({ ...draft, transport: e.target.value as Transport })}
              >
                {Object.entries(transportNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.far}
                onChange={(e) => setDraft({ ...draft, far: e.target.checked })}
              />
              距離にかかわらず遠方扱い
            </label>
            <Field label="メモ">
              <textarea
                value={draft.memo}
                onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
              />
            </Field>
          </div>
          <div className="actions">
            <button className="primary" type="submit">
              現場を保存
            </button>
            <button type="button" onClick={() => setDraft(null)}>
              キャンセル
            </button>
          </div>
          <p className="muted">既存の作業記録に保存された距離・移動手段は変わりません。</p>
        </form>
      )}
      <div className="sites-grid">
        {data.sites.map((site) => (
          <section className="panel" key={site.id}>
            <div className="section-heading">
              <span className="site-icon">⌖</span>
              <span className="badge">
                {site.far || site.km >= farKm ? "遠方現場" : "近距離現場"}
              </span>
            </div>
            <h2>{site.name}</h2>
            <p>
              片道 <b>{site.km}km</b> · {transportNames[site.transport]}
            </p>
            <p className="muted">{site.memo || "メモなし"}</p>
            <div className="actions">
              <button onClick={() => setDraft({ ...site })}>編集</button>
              <button
                className="danger"
                disabled={
                  data.sites.length === 1 ||
                  data.entries.some((e) => e.works.some((w) => w.siteId === site.id)) ||
                  data.patterns.some((p) => p.entry.works.some((w) => w.siteId === site.id))
                }
                onClick={() => {
                  if (window.confirm("この現場を削除しますか？"))
                    update({ ...data, sites: data.sites.filter((s) => s.id !== site.id) });
                }}
              >
                削除
              </button>
            </div>
          </section>
        ))}
      </div>
      <p className="muted">記録・パターンで使用中の現場と、最後の1件は削除できません。</p>
    </>
  );
}
