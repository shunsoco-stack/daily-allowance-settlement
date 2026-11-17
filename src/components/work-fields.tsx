import { Field } from "./common";
import { blankWork } from "@/lib/seed";
import type { Site, Work } from "@/lib/types";
export const transportNames = {
  public: "公共交通",
  car: "自家用車",
  company: "会社車両",
  walk: "徒歩・自転車",
};
export function WorkFields({
  work,
  sites,
  onChange,
}: {
  work: Work;
  sites: Site[];
  onChange: (work: Work) => void;
}) {
  const change = (key: keyof Work, value: string | number | boolean) =>
    onChange({ ...work, [key]: value });
  return (
    <div className="form-grid">
      <Field label="現場">
        <select
          value={work.siteId}
          onChange={(e) => {
            const s = sites.find((s) => s.id === e.target.value)!;
            onChange({
              ...work,
              ...{ siteId: s.id, km: s.km, far: s.far, transport: blankWork(s).transport },
            });
          }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="片道距離（km）">
        <input
          type="number"
          min="0"
          step="0.1"
          required
          value={work.km}
          onChange={(e) => change("km", Number(e.target.value))}
        />
      </Field>
      <Field label="開始時刻">
        <input
          type="time"
          required
          value={work.start}
          onChange={(e) => change("start", e.target.value)}
        />
      </Field>
      <Field label={`終了時刻${work.end < work.start ? "（翌日）" : ""}`}>
        <input
          type="time"
          required
          value={work.end}
          onChange={(e) => change("end", e.target.value)}
        />
      </Field>
      <Field label="休憩（分）">
        <input
          type="number"
          min="0"
          required
          value={work.breakMinutes}
          onChange={(e) => change("breakMinutes", Number(e.target.value))}
        />
      </Field>
      <Field label="移動手段">
        <select value={work.transport} onChange={(e) => change("transport", e.target.value)}>
          {Object.entries(transportNames).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {work.transport === "public" && (
        <Field label="公共交通の実費（円・往復合計）">
          <input
            type="number"
            min="0"
            value={work.fare}
            onChange={(e) => change("fare", Number(e.target.value))}
          />
        </Field>
      )}
      <Field label="駐車場実費（円）">
        <input
          type="number"
          min="0"
          value={work.parking}
          onChange={(e) => change("parking", Number(e.target.value))}
        />
      </Field>
      <Field label="高速実費（円）">
        <input
          type="number"
          min="0"
          value={work.toll}
          onChange={(e) => change("toll", Number(e.target.value))}
        />
      </Field>
      {work.transport === "car" && (
        <label className="check">
          <input
            type="checkbox"
            checked={work.roundTrip}
            onChange={(e) => change("roundTrip", e.target.checked)}
          />
          往復（距離区分の定額 × 2）
        </label>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={work.far}
          onChange={(e) => change("far", e.target.checked)}
        />
        距離にかかわらず遠方現場として扱う
      </label>
    </div>
  );
}
