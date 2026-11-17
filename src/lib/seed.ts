import { addDays, japanNow, periodFor } from "./dates";
import { endTimestamp } from "./time";
import type { Data, Entry, Rule, Site, Work } from "./types";

export function defaultRule(effective: string): Rule {
  return {
    id: "rule-old",
    name: "現場手当規程 v1",
    effective,
    near: 2000,
    far: 4000,
    overnight: 5000,
    farKm: 30,
    halfHours: 4,
    halfPercent: 50,
    overtimeHours: 8,
    overtimeRate: 1200,
    rounding: "floor",
    unit: 15,
    nightStart: "22:00",
    nightEnd: "05:00",
    nightRate: 500,
    earlyTime: "07:00",
    earlyAmount: 800,
    holidayAmount: 2000,
    holidays: [],
    special: [
      { id: "height", name: "高所作業", amount: 1000 },
      { id: "traffic", name: "夜間交通規制", amount: 1500 },
      { id: "license", name: "有資格作業", amount: 800 },
    ],
    lodging: 7000,
    mealHours: 10,
    mealAmount: 800,
    distances: [
      { max: 10, amount: 300 },
      { max: 30, amount: 800 },
      { max: 60, amount: 1500 },
    ],
    carAbove: 2500,
    walk: 200,
    parkingCap: 2000,
    tollCap: 5000,
    dailyCap: 0,
  };
}
export function blankWork(site: Site): Work {
  return {
    siteId: site.id,
    km: site.km,
    far: site.far,
    start: "08:00",
    end: "17:00",
    breakMinutes: 60,
    transport: site.transport,
    roundTrip: true,
    fare: 0,
    parking: 0,
    toll: 0,
  };
}
// それぞれの勤務内容は手書き。日付だけを起動日の相対日へ割り当てる。
const shifts: [number, number, string, string, number, boolean, string[], string][] = [
  [-45, 0, "08:00", "17:00", 60, false, [], "搬入準備"],
  [-44, 1, "08:00", "18:00", 60, false, ["license"], "分電盤の更新"],
  [-43, 2, "09:00", "17:00", 60, false, [], "展示ブースの組立"],
  [-41, 0, "08:00", "12:00", 30, false, [], "午前の点検"],
  [-40, 3, "07:00", "18:00", 60, true, ["height"], "屋外設備の施工"],
  [-39, 3, "08:00", "17:00", 60, true, [], "配線仕上げ"],
  [-38, 4, "21:00", "06:00", 60, false, ["traffic"], "夜間切替作業"],
  [-36, 5, "08:30", "17:30", 60, false, [], "内装設備の確認"],
  [-35, 6, "06:00", "16:00", 60, false, ["height"], "足場周辺の点検"],
  [-34, 1, "08:00", "19:00", 60, false, ["license"], "試運転"],
  [-33, 7, "09:00", "17:00", 60, false, [], "照明取付"],
  [-31, 2, "08:00", "18:30", 60, false, [], "イベント設営"],
  [-30, 0, "08:00", "17:00", 60, false, [], "空調設備の調整"],
  [-29, 1, "08:00", "17:00", 60, false, [], "定期確認"],
  [-28, 5, "08:00", "12:00", 30, false, [], "短時間作業"],
  [-26, 3, "07:00", "18:00", 60, true, ["height"], "遠方出張"],
  [-25, 3, "08:00", "17:00", 60, true, ["license"], "設備検査"],
  [-24, 4, "22:00", "05:00", 45, false, ["traffic"], "交通設備の交換"],
  [-22, 0, "08:00", "18:00", 60, false, [], "配管作業"],
  [-21, 6, "06:30", "17:00", 60, false, [], "早朝搬入"],
  [-20, 1, "08:00", "17:00", 60, false, ["license"], "端末接続"],
  [-19, 2, "09:00", "18:00", 60, false, [], "会場撤去"],
  [-17, 7, "08:00", "17:00", 60, false, [], "照明調整"],
  [-16, 5, "08:00", "17:30", 60, false, [], "内装仕上げ"],
  [-15, 0, "08:00", "17:00", 60, false, ["height"], "天井設備の確認"],
  [-14, 1, "08:00", "19:00", 60, false, [], "設備更新"],
  [-12, 4, "21:00", "06:00", 60, false, ["traffic"], "夜間施工"],
  [-11, 3, "08:00", "18:00", 60, true, [], "出張初日"],
  [-10, 3, "08:00", "17:00", 60, true, ["license"], "検査立会"],
  [-9, 6, "08:00", "12:00", 30, false, [], "半日点検"],
  [-7, 2, "08:00", "18:00", 60, false, [], "設営補助"],
  [-6, 0, "08:00", "17:00", 60, false, [], "設備取付"],
  [-5, 7, "06:00", "17:00", 60, false, ["height"], "早朝作業"],
  [-4, 1, "08:00", "18:30", 60, false, ["license"], "稼働確認"],
  [-3, 5, "08:00", "17:00", 60, false, [], "最終調整"],
  [-2, 0, "08:00", "12:00", 30, false, [], "午前と午後の2現場"],
  [-1, 4, "21:00", "06:00", 60, false, ["traffic"], "夜間保守"],
  [0, 0, "08:00", "17:00", 60, false, [], "本日の設備点検"],
];
export function seed(now: Date): Data {
  const today = japanNow(now).date;
  const sites: Site[] = [
    {
      id: "s1",
      name: "青凪駅前ビル 改修工事（架空）",
      km: 8,
      transport: "car",
      far: false,
      memo: "東側の搬入口",
    },
    {
      id: "s2",
      name: "みなと物流センター 設備更新（架空）",
      km: 42,
      transport: "car",
      far: false,
      memo: "第2倉庫",
    },
    {
      id: "s3",
      name: "若葉ホール 展示会設営（架空）",
      km: 12,
      transport: "public",
      far: false,
      memo: "西入口",
    },
    {
      id: "s4",
      name: "白波リゾート 空調更新（架空）",
      km: 120,
      transport: "car",
      far: true,
      memo: "宿泊出張",
    },
    {
      id: "s5",
      name: "星見通り 道路設備工事（架空）",
      km: 24,
      transport: "company",
      far: false,
      memo: "夜間作業",
    },
    {
      id: "s6",
      name: "ひだまり保育園 内装工事（架空）",
      km: 3,
      transport: "walk",
      far: false,
      memo: "近隣配慮",
    },
    {
      id: "s7",
      name: "風丘工場 安全設備点検（架空）",
      km: 55,
      transport: "car",
      far: false,
      memo: "安全装備着用",
    },
    {
      id: "s8",
      name: "水音図書館 照明更新（架空）",
      km: 18,
      transport: "public",
      far: false,
      memo: "裏口集合",
    },
  ];
  const current = periodFor(today, 20);
  const old = defaultRule(addDays(today, -100));
  const latest = {
    ...structuredClone(old),
    id: "rule-new",
    name: "現場手当規程 v2",
    effective: addDays(current.start, 5),
    near: 2200,
    far: 4200,
    overtimeRate: 1300,
  };
  const entries: Entry[] = shifts
    .map(([offset, index, start, end, rest, lodging, specials, memo]) => {
      const date = addDays(today, offset);
      const work = {
        ...blankWork(sites[index]),
        start,
        end,
        breakMinutes: rest,
        fare: sites[index].transport === "public" ? 960 : 0,
        parking: index === 0 ? 600 : 0,
      };
      const works =
        offset === -2
          ? [work, { ...blankWork(sites[1]), start: "13:00", end: "17:00", breakMinutes: 0 }]
          : [work];
      return { id: `entry${offset}`, date, works, lodging, specials, memo };
    })
    .filter((e) => e.works.every((w) => endTimestamp(e.date, w) < now.getTime()));
  return {
    version: 1,
    closing: 20,
    rules: [old, latest],
    sites,
    entries,
    snapshots: [],
    patterns: [
      {
        name: "通常の現場作業",
        entry: {
          id: "pattern",
          date: today,
          works: [blankWork(sites[0])],
          lodging: false,
          specials: [],
          memo: "",
        },
      },
    ],
  };
}
