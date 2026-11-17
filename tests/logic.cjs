const { test } = require("node:test");
const assert = require("node:assert/strict");
const { defaultRule, seed, blankWork } = require("../src/lib/seed.ts");
const {
  interval,
  nightMinutes,
  workMinutes,
  roundedMinutes,
  endTimestamp,
} = require("../src/lib/time.ts");
const { calculate, transportCost } = require("../src/lib/calc.ts");
const { periodFor, weekFor, previousPeriod, japanNow } = require("../src/lib/dates.ts");
const { ruleFor, canRemoveRule } = require("../src/lib/rules.ts");
const { summarize, confirmPeriod, difference, locked } = require("../src/lib/summary.ts");
const { makeCsv, csvFilename, csvCell } = require("../src/lib/csv.ts");
const rule = defaultRule("2020-01-01");
test("CSVの負の数値は数式対策の文字列に変えない", () => {
  assert.equal(csvCell(-1600), '"-1600"');
  assert.equal(csvCell("-test"), '"\'-test"');
});
const work = blankWork({ id: "s", km: 8, far: false, transport: "car" });
const entry = {
  id: "e",
  date: "2026-11-18",
  works: [work],
  lodging: false,
  specials: [],
  memo: "",
};
const amount = (entry, category, override = {}) =>
  calculate(entry, [{ ...rule, ...override }])
    .lines.filter((l) => l.category === category)
    .reduce((s, l) => s + l.amount, 0);
test("日またぎは翌朝までの9時間", () =>
  assert.equal(interval({ start: "21:00", end: "06:00" }).duration, 540));
test("実働から休憩を引く", () => assert.equal(workMinutes(work), 480));
test("深夜帯を翌日に分割", () =>
  assert.equal(
    nightMinutes({ ...work, start: "21:00", end: "06:00", breakMinutes: 0 }, rule),
    420,
  ));
test("早朝も前日深夜帯の続きとして判定", () =>
  assert.equal(
    nightMinutes({ ...work, start: "02:00", end: "08:00", breakMinutes: 0 }, rule),
    180,
  ));
test("深夜の休憩は比例配分", () =>
  assert.equal(
    nightMinutes({ ...work, start: "22:00", end: "06:00", breakMinutes: 60 }, rule),
    367.5,
  ));
test("日中の任意時間帯にも対応", () =>
  assert.equal(
    nightMinutes({ ...work, breakMinutes: 0 }, { ...rule, nightStart: "12:00", nightEnd: "14:00" }),
    120,
  ));
test("15分切り捨て", () => assert.equal(roundedMinutes(29, 15, "floor"), 15));
test("30分切り上げ", () => assert.equal(roundedMinutes(31, 30, "ceil"), 60));
test("15分四捨五入", () => assert.equal(roundedMinutes(23, 15, "round"), 30));
test("1分単位", () => assert.equal(roundedMinutes(23, 1, "floor"), 23));
test("近距離日当", () => assert.equal(amount(entry, "日当"), 2000));
test("遠方境界は含む", () =>
  assert.equal(amount({ ...entry, works: [{ ...work, km: 30 }] }, "日当"), 4000));
test("宿泊日当は遠方より優先", () =>
  assert.equal(amount({ ...entry, lodging: true }, "日当"), 5000));
test("半日は実働4時間未満", () =>
  assert.equal(
    amount({ ...entry, works: [{ ...work, end: "12:00", breakMinutes: 30 }] }, "日当"),
    1000,
  ));
test("実働4時間ちょうどは全額", () =>
  assert.equal(
    amount({ ...entry, works: [{ ...work, end: "12:00", breakMinutes: 0 }] }, "日当"),
    2000,
  ));
test("時間外の単価と端数", () =>
  assert.equal(amount({ ...entry, works: [{ ...work, end: "18:29" }] }, "時間外"), 1500));
test("早出を支給", () =>
  assert.equal(amount({ ...entry, works: [{ ...work, start: "06:59" }] }, "早出"), 800));
test("早出の境界は含まない", () =>
  assert.equal(amount({ ...entry, works: [{ ...work, start: "07:00" }] }, "早出"), 0));
test("土曜日の休日手当", () =>
  assert.equal(amount({ ...entry, date: "2026-11-21" }, "休日"), 2000));
test("指定休日の手当", () => assert.equal(amount(entry, "休日", { holidays: [entry.date] }), 2000));
test("特殊作業は選択した項目だけ", () =>
  assert.equal(amount({ ...entry, specials: ["height", "license"] }, "特殊"), 1800));
test("宿泊は1泊", () => assert.equal(amount({ ...entry, lodging: true }, "宿泊"), 7000));
test("食事は拘束10時間以上", () =>
  assert.equal(amount({ ...entry, works: [{ ...work, end: "18:00" }] }, "食事"), 800));
test("車の区分境界と往復", () =>
  assert.equal(transportCost({ ...work, km: 30 }, rule).amount, 1600));
test("車の区分超は最大定額", () =>
  assert.equal(transportCost({ ...work, km: 61, roundTrip: false }, rule).amount, 2500));
test("公共交通は入力実費", () =>
  assert.equal(transportCost({ ...work, transport: "public", fare: 1234 }, rule).amount, 1234));
test("会社車両は0円", () =>
  assert.equal(transportCost({ ...work, transport: "company" }, rule).amount, 0));
test("徒歩は定額", () =>
  assert.equal(transportCost({ ...work, transport: "walk" }, rule).amount, 200));
test("駐車場・高速の上限", () =>
  assert.equal(
    amount(
      { ...entry, works: [{ ...work, transport: "company", parking: 3000, toll: 6000 }] },
      "交通費",
    ),
    7000,
  ));
test("総額上限と負の調整行", () => {
  const result = calculate(entry, [{ ...rule, dailyCap: 1000 }]);
  assert.equal(result.total, 1000);
  assert.equal(result.lines.at(-1).amount, -1600);
});
test("複数現場でも日当は1回", () =>
  assert.equal(
    amount(
      {
        ...entry,
        works: [
          { ...work, end: "12:00", breakMinutes: 0 },
          { ...work, start: "13:00" },
        ],
      },
      "日当",
    ),
    2000,
  ));
test("適用開始日を含み最新規程を選択", () => {
  const next = { ...rule, id: "next", effective: "2026-11-18" };
  assert.equal(ruleFor(entry.date, [next, rule]).id, "next");
  assert.equal(ruleFor("2026-11-17", [next, rule]).id, rule.id);
});
test("適用前は規程なし", () => assert.equal(ruleFor("2019-01-01", [rule]), undefined));
test("最後の規程は削除できない", () =>
  assert.equal(canRemoveRule(rule.id, [rule], [entry]), false));
for (const [date, closing, start, end] of [
  ["2026-11-20", 20, "2026-10-21", "2026-11-20"],
  ["2026-11-21", 20, "2026-11-21", "2026-12-20"],
  ["2024-02-29", 0, "2024-02-01", "2024-02-29"],
  ["2025-02-28", 0, "2025-02-01", "2025-02-28"],
  ["2026-01-01", 20, "2025-12-21", "2026-01-20"],
  ["2026-12-31", 25, "2026-12-26", "2027-01-25"],
  ["2026-03-16", 15, "2026-03-16", "2026-04-15"],
])
  test(`締め日 ${date} / ${closing}`, () =>
    assert.deepEqual(periodFor(date, closing), { start, end }));
test("週次は月曜から日曜", () =>
  assert.deepEqual(weekFor("2026-11-22"), { start: "2026-11-16", end: "2026-11-22" }));
test("日本時間の年またぎ", () =>
  assert.equal(japanNow(new Date("2026-12-31T16:00:00Z")).date, "2027-01-01"));
test("夜勤終了日時のタイムゾーン", () =>
  assert.equal(
    endTimestamp(entry.date, { start: "21:00", end: "06:00" }),
    Date.parse("2026-11-19T06:00:00+09:00"),
  ));
test("月次・週次・現場別の合計は一致", () => {
  const data = seed(new Date("2026-11-18T20:00:00+09:00"));
  const result = summarize(data.entries, data.rules, periodFor(entry.date, 20));
  for (const totals of [result.totals, result.weeks, result.sites])
    assert.equal(
      Object.values(totals).reduce((a, b) => a + b, 0),
      result.total,
    );
});
test("確定後の規程変更で差額が出る", () => {
  const data = { entries: [entry], rules: [rule] };
  const snapshot = confirmPeriod(data, periodFor(entry.date, 20), "now");
  assert.equal(locked(entry.date, [snapshot]), true);
  assert.equal(difference(snapshot, [{ ...rule, near: 3000 }], [entry]), 1000);
  assert.equal(snapshot.total, 2600);
});
test("前期の境界", () =>
  assert.deepEqual(previousPeriod(periodFor(entry.date, 20), 20), {
    start: "2026-09-21",
    end: "2026-10-20",
  }));
test("CSVはBOMと引用符、改行を保持", () => {
  const data = seed(new Date("2026-11-18T20:00:00+09:00"));
  const period = periodFor(entry.date, 20);
  assert.ok(makeCsv(data, period).startsWith("\uFEFF"));
  assert.ok(makeCsv(data, period, true).includes('"合計"'));
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
});
test("CSVファイル名は期間を含む", () =>
  assert.equal(
    csvFilename({ start: "2026-10-21", end: "2026-11-20" }),
    "精算_2026-10-21_2026-11-20.csv",
  ));
