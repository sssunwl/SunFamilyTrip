# P1 派工單 · 骨架（給 Codex）

> 上游規格：`docs/SPEC.md`（唯一真相來源）。本檔只講 P1 這一期怎麼做。
> **凡本檔沒寫的，就是本期不做。** 有疑問回報，不要自行延伸。

---

## 這一期的完成標準（只有一條）

**釜山 2026 與芭堤雅 2026 兩趟舊行程的資料，能在新站正確顯示（唯讀）。**

做到這條就結束 P1，停下來等審查。編輯功能是 P2 的事，本期一行都不要寫。

---

## 0. 硬性邊界

**不要做**（這些全部是後面幾期的，寫了會被退回）：
- ❌ 任何編輯／新增／刪除行程的介面或邏輯（P2）
- ❌ 拖曳、積木庫、屬性面板（P2）
- ❌ 地點匯入與 Cloudflare Worker（P2）
- ❌ 文字版複製、CSV 匯入、圖片上傳、affiliate（P3）
- ❌ 年曆、請假攻略、家庭月曆、個人行程（P4）
- ❌ 深色模式以外的動效打磨、骨架屏（P5）
- ❌ 不要改動 repo 根目錄的舊站檔案（`index.html`、`trips/`、`shared/`、`calendar.html`）——舊站還在 GitHub Pages 上跑，家人在用
- ❌ 不要動 `assets/busan/products/` 的 39 張圖
- ❌ 不要在這個 repo 裡放任何金鑰。Firebase 的 `apiKey` 例外（它不是密鑰）

**新程式全部放在 `app/` 子資料夾**，跟舊站完全隔離。

---

## 1. 專案骨架

```
app/
├── package.json          Vite + React 18 + TypeScript + Tailwind + react-router-dom
├── vite.config.ts
├── tsconfig.json
├── index.html
├── wrangler.jsonc        Cloudflare Workers + Static Assets（照 sunhealth/siksik/setgo 模式）
├── src/
│   ├── main.tsx
│   ├── App.tsx           路由
│   ├── styles/tokens.css 設計 token（見 §4）
│   ├── styles/global.css
│   ├── lib/
│   │   ├── firebase.ts   initializeApp / getFirestore / getAuth
│   │   ├── auth.ts       登入、登出、目前使用者
│   │   └── db.ts         讀取用的 query（本期只需要讀）
│   ├── types/            見 §2
│   ├── routes/
│   │   ├── Home.tsx      `/`          本期只放佔位：站名 + 家庭清單連結
│   │   ├── Family.tsx    `/f/:family` 家庭資訊 + 行程清單
│   │   ├── Trip.tsx      `/f/:family/t/:trip` 逐日行程（唯讀）
│   │   └── Login.tsx     `/login`     家庭代號 + 密碼兩格
│   └── components/       Block / DayList / TripHeader / MemberList …
├── migration/
│   ├── extract.ts        舊 HTML → JSON（見 §5）
│   ├── import.ts         JSON → Firestore
│   └── out/              產出的 JSON（進版控，方便審查）
└── firestore.rules       見 §6
```

Firebase 設定沿用現有專案 `sunfamily-trips`，值抄 `shared/firebase-config.js`。

---

## 2. 型別（`src/types/trip.ts`）

照抄，不要自己改欄位名 —— P2 的編輯器會依賴這份。

```ts
export type BlockType =
  | 'transport' | 'food' | 'sight' | 'shopping' | 'hotel'
  | 'rest' | 'free' | 'meetup' | 'split' | 'todo' | 'note';

export interface Place {
  name: string;              // 給人看的店名／地點名
  localName?: string;        // 當地語言，給店員看（舊資料的 show_text）
  mapUrl?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface SplitGroup {
  label: string;             // 「醫美組」
  desc: string;
  memberIds: string[];
}

export interface Block {
  id: string;
  type: BlockType;
  dayId: string;
  order: number;
  time: string;              // "09:30"
  durationMin: number;       // 0 = 不佔時段
  title: string;
  desc?: string;
  place?: Place;
  assignees?: string[];      // 空或未定義 = 全團
  warn?: string;             // ⚠️ 提示
  images?: string[];
  groups?: SplitGroup[];     // 只有 type==='split' 用
  affiliate?: { url: string; platform: string } | null;
}

export interface Day {
  id: string;                // "d1"
  date: string;              // "2026-08-05"（ISO，不是 "8/5"）
  weekday: string;           // "三"
  theme: string;
  highlights?: string;
}

export interface TripMember {
  id: string; name: string; avatar: string;
  role?: string;
  excludeFromSplit?: boolean;
}

export interface GuideItem {
  id: string;
  category: string;
  name: string;
  localName?: string;
  tag?: string;
  note?: string;
  desc?: string;
  images: string[];
  showText?: string;
  buyable: boolean;
  price?: { amount: number; currency: string } | null;
  affiliate?: { url: string; platform: string; disclosure: string } | null;
  source: 'manual' | 'csv' | 'guide' | 'legacy';
}

export interface Trip {
  meta: {
    title: string; subtitle: string;
    city: string; country: string;
    coords?: { lat: number; lng: number };
    currency: string;
    startDate: string; endDate: string;   // ISO
    heroImg?: string; photosUrl?: string;
    emergency: { label: string; phone: string }[];
    status: 'draft' | 'upcoming' | 'live' | 'past';
  };
  members: TripMember[];
  days: Day[];
  blocks: Block[];
  guide: GuideItem[];
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface AvailabilityEntry {
  id: string;
  memberIds: string[];
  from: string;              // ISO
  to: string;                // ISO
  kind: 'trip' | 'busy' | 'free';
  label: string;
  note?: string;
  createdBy: string;
  createdAt: number;
}

export interface Family {
  id: string; name: string; shortName: string;
  theme: { accent: string; bg: string };
  leaders: string[];                  // uid
  members: TripMember[];
  holidayCountries: string[];
}
```

`meta.status` 由 `startDate`/`endDate` 對今天算出來寫死進資料；本期釜山與芭堤雅都是 `past`。

---

## 3. 路由與畫面（本期只要唯讀）

| 路由 | 本期要做到 |
|---|---|
| `/` | 佔位頁：站名、兩個家庭的連結。**不要做年曆**（P4） |
| `/login` | 兩格表單（家庭代號、密碼）→ `signInWithEmailAndPassword(auth, \`${code}@songsong.local\`, pw)`。登入成功導回上一頁。錯誤訊息要說人話 |
| `/f/:family` | 家庭名、成員頭像列、該家庭行程清單（依 status 分「即將出發／進行中／回憶錄」三組）。點進去到 Trip |
| `/f/:family/t/:trip` | 逐日行程。Day 分頁 + 每日的 Block 列表；顯示時間、類型、標題、描述、地點（連 Google Maps）、⚠️ 提示、分隊分組。另外顯示 meta（航班／住宿／緊急電話可先用純文字區塊） |

Block 的視覺照 §4 的類型色：左緣 3px 色條 + 類型 icon + 類型名。**這是全站唯一長得像卡片的東西**，其餘一律用細線分隔的列（`border-bottom: 1px solid var(--rule-soft)`）。

`/f/:family/t/:trip` 進站時若今天在行程期間內，自動捲到今天那一天。

---

## 4. 設計 token（`src/styles/tokens.css`）

**照抄**。深淺兩套都要，且**每個變數都要先在 bare `:root` 定義**，再在 media query 與 `[data-theme]` 覆寫。

```css
:root{
  --paper:#E8ECEB; --surface:#F8FAF9; --surface-2:#EFF3F2;
  --ink:#0E1918; --ink2:#55605E; --ink3:#8A9694;
  --rule:#C6D0CE; --rule-soft:#D8E0DE;
  --accent:#0B6E63; --accent-ink:#FFFFFF; --accent-wash:#0B6E6314;
  --warn:#A8551B; --warn-wash:#A8551B14;
  --bt-transport:#4C6E9B; --bt-food:#B85F31; --bt-sight:#377B57;
  --bt-shopping:#7E4F92; --bt-hotel:#2F4858; --bt-rest:#8C7F5E;
  --bt-free:#6E7D7B; --bt-meetup:#B33A2B; --bt-split:#9A7616;
  --bt-todo:#A3355A; --bt-note:#67736F;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){ /* 下表 */ } }
:root[data-theme="dark"]{ /* 同下表 */ }
```

深色覆寫值：
```
--paper:#0C1211; --surface:#141B1A; --surface-2:#1B2321;
--ink:#E7EDEB; --ink2:#9AA7A4; --ink3:#6B7876;
--rule:#28322F; --rule-soft:#1F2826;
--accent:#3BB9A5; --accent-ink:#07211D; --accent-wash:#3BB9A51F;
--warn:#D98F4E; --warn-wash:#D98F4E1F;
--bt-transport:#7FA3D0; --bt-food:#E0906A; --bt-sight:#6DB98D;
--bt-shopping:#B588C7; --bt-hotel:#7D9BAE; --bt-rest:#C0B18A;
--bt-free:#9BAAA7; --bt-meetup:#E27567; --bt-split:#D4AC4A;
--bt-todo:#DC7896; --bt-note:#9AA6A2;
color-scheme:dark;
```

字體（Google Fonts）：
- 標題 `Noto Serif HK` 700/900
- 內文與介面 `Noto Sans HK` 400/500/700
- 時間／金額／代號 `IBM Plex Mono` 400/500/600，一律加 `font-variant-numeric: tabular-nums`

`body` 必須明確設 `background: var(--paper)`（不設會借用宿主底色）。

---

## 5. 資料遷移（`app/migration/`）

### extract.ts
輸入 `trips/busan2026.html`、`trips/pattaya2026.html`，輸出 `migration/out/<tripId>.json`。

做法：用 Node 的 `vm` 模組建一個 sandbox，把該 HTML 裡**第一個** `<script>` 區塊（就是定義 `TRIP_*` / `MEMBERS` / `ITINERARY` / `GUIDE_ITEMS` 的那個）整段丟進去 `vm.runInNewContext`，再從 context 讀出全域變數。**不要用正則硬拆**。

欄位對應：

| 舊 | 新 |
|---|---|
| `TRIP_TITLE` / `TRIP_SUBTITLE` / `TRIP_CITY` | `meta.title` / `meta.subtitle` / `meta.city` |
| `TRIP_COORDS {lat,lon}` | `meta.coords {lat,lng}` — **注意 `lon` 改成 `lng`** |
| `TRIP_START_DATE` / `TRIP_END_DATE` | `meta.startDate` / `meta.endDate` |
| `TRIP_DEFAULT_CURRENCY` | `meta.currency` |
| `TRIP_EMERGENCY` | `meta.emergency` |
| `MEMBERS` | `members` |
| `ITINERARY[i]` | `days[i]`（`date` 由 `"8/5"` + 年份組成 ISO） |
| `ITINERARY[i].details[j]` | `blocks[]`，`dayId` = 該日 `id`，`order` = j |
| detail `.type` | `activity`→`sight`，其餘 `transport`/`food`/`hotel`/`shopping` 原樣 |
| detail `.location` | `place.name` |
| detail `.show_text` | `place.localName` |
| （舊資料沒有 mapUrl） | `place.mapUrl` = `https://www.google.com/maps/search/?api=1&query=` + `encodeURIComponent(location)` |
| detail `.desc` 開頭有 `⚠️` 的句子 | 抽出來放 `warn`，其餘留 `desc` |
| `GUIDE_ITEMS` | `guide[]`，`buyable` 沿用，`image` → `images:[...]`，`source:'legacy'` |
| `TRIP_FLIGHTS` / `TRIP_ACCOMMODATION` | 先原樣塞進 `meta` 下的 `flights` / `accommodation`，本期只需顯示 |

`durationMin` 舊資料沒有 → 用**下一個 block 的時間減自己的時間**推算，最後一個給 90。推不出來給 60。

產出的 JSON **要進版控**，方便人肉審查對不對。

### import.ts
把 `out/*.json` 寫進 Firestore：
- `families/sunlau`（name「Sun & Lau Family」, shortName「SLFT」, holidayCountries `["HK","TW"]`）
- `families/sunlau/trips/busan2026`、`families/sunlau/trips/pattaya2026`
- `families/sunlau/availability/`（家人檔期，SPEC §7.8）**本期只建集合與型別，不做介面**——介面是 P4。舊資料裡 Lam 8/3–8/5 自己先到沖繩／廣安里這段，順手轉成一筆 `kind:'trip'` 當範例資料
- 舊的 `trips/{id}/expenses|polls|notes|tools` 子集合**一併搬到** `families/sunlau/trips/{id}/` 底下（記帳與留言是真實家庭資料，不能弄丟）
- 用 Firebase Admin SDK，service account 金鑰放 `~/.config/songsong/`，**不要進 repo**

搬移前先把舊 Firestore 資料 export 一份備份到 `~/.config/songsong/backup-<日期>/`。

---

## 6. Firestore Rules（`app/firestore.rules`）

本期先寫成**讀取開放、寫入全關**（P2 才開領隊寫入）：

```
match /families/{fid} {
  allow read: if true;
  allow write: if false;
  match /trips/{tid} {
    allow read: if true;
    allow write: if false;
    match /{sub=**} { allow read: if true; allow write: if false; }
  }
}
match /users/{uid}/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

⚠️ **上線前必須用 Firebase Rules 模擬器逐條測過**（讀開放、寫全關、`users/{uid}` 僅本人），並把測試結果回報給 SS。規則是本專案唯一的真安全邊界。

---

## 7. 部署

`app/wrangler.jsonc`，Cloudflare Workers + Static Assets，照 `sunhealth` / `siksik` / `setgo` 已驗過的模式寫。網域 `songsong.sssuni.com` **由 SS 手動在 Cloudflare 設定**，你只要把 wrangler 設定與 `npm run deploy` 準備好。

換 origin 後要在 Firebase 專案 `sunfamily-trips` 的 **Authentication → Authorized domains** 加 `songsong.sssuni.com` —— 這步由 SS 做，你在 README 註明即可。

**舊站不下線。** repo 根目錄的 GitHub Pages 維持原樣。

---

## 8. 交付時要回報的

1. `app/` 能 `npm run dev` 跑起來，兩趟行程都顯示正確
2. `migration/out/*.json` 已產出並自行對照過舊 HTML（列出你發現的任何對不上的地方）
3. Firestore Rules 模擬器測試結果
4. **你認為規格寫錯或寫不清楚的地方** —— 這一項一定要寫，不要自己猜著補
