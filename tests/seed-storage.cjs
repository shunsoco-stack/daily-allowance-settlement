const { test } = require("node:test");
const assert = require("node:assert/strict");
const { seed } = require("../src/lib/seed.ts");
const { validateData, restore, validEntry } = require("../src/lib/storage.ts");
const { endTimestamp } = require("../src/lib/time.ts");
const { japanNow, periodFor, previousPeriod, inPeriod } = require("../src/lib/dates.ts");
test("締め日の型が壊れた保存データを検出", () => {
  const data = seed(new Date());
  data.closing = "20";
  assert.equal(validateData(data), false);
});
for (const date of [
  "2026-11-18",
  "2026-11-20",
  "2026-11-21",
  "2026-11-30",
  "2026-12-31",
  "2027-01-01",
  "2024-02-29",
]) {
  for (const time of ["00:10", "05:00", "12:00", "18:00", "23:50"]) {
    test(`シードの日時整合性 ${date} ${time}`, () => {
      const now = new Date(`${date}T${time}:00+09:00`);
      const data = seed(now);
      assert.ok(validateData(data));
      for (const entry of data.entries)
        for (const work of entry.works) assert.ok(endTimestamp(entry.date, work) < now.getTime());
      const period = periodFor(japanNow(now).date, 20);
      const previous = previousPeriod(period, 20);
      assert.ok(data.entries.some((e) => inPeriod(e.date, previous)));
      if (date === period.start && time < "17:01") {
        // 今期開始日の未完了時間帯には、未来の作業記録を捏造しない。
        assert.equal(data.entries.filter((e) => inPeriod(e.date, period)).length, 0);
      } else assert.ok(data.entries.some((e) => inPeriod(e.date, period)));
      if (time < "17:01") assert.ok(data.entries.every((e) => e.date !== date));
    });
  }
}
test("壊れたJSONは復元して通知対象", () =>
  assert.equal(restore("{broken", new Date()).recovered, true));
test("初回は正常初期化", () => assert.equal(restore(null, new Date()).recovered, false));
test("配列の欠落を検出", () => assert.equal(validateData({ version: 1 }), false));
test("負の金額を検出", () => {
  const d = seed(new Date());
  d.rules[0].near = -1;
  assert.equal(validateData(d), false);
});
test("不正な日付を検出", () => {
  const d = seed(new Date());
  d.entries[0].date = "2026-02-30";
  assert.equal(validateData(d), false);
});
test("参照切れを検出", () => {
  const d = seed(new Date());
  d.entries[0].works[0].siteId = "missing";
  assert.equal(validateData(d), false);
});
test("時間重複を検出", () => {
  const d = seed(new Date());
  const e = d.entries[0];
  e.works.push({ ...e.works[0] });
  assert.equal(validEntry(e), false);
});
test("休憩が拘束時間以上を検出", () => {
  const d = seed(new Date());
  d.entries[0].works[0].breakMinutes = 9999;
  assert.equal(validateData(d), false);
});
test("同日複数レコードを検出", () => {
  const d = seed(new Date());
  d.entries[1].date = d.entries[0].date;
  assert.equal(validateData(d), false);
});
test("正常データを往復保存", () => {
  const d = seed(new Date());
  assert.deepEqual(restore(JSON.stringify(d), new Date()).data, d);
});
