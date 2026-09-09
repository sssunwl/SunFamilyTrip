# 爽爽 Songsong — 產品規格（唯一真相來源）

> 本檔是本專案的唯一真相來源。任何實作（含 Codex）以此為準；程式碼與本檔衝突時，先改本檔再改程式碼。
> 建立：2026-09-08　狀態：規格定稿中，尚未實作
> 視覺提案（可操作）：見 §14

---

## 0. 一句話

**給領隊用的家庭旅行規劃工具。** 用搬積木的方式排行程，排完一鍵複製成文字傳給家人。

不是給團員看的行程網站 —— 那是舊版 SunFamilyTrip 做錯的假設。

---

## 1. 為什麼要改版（現況診斷）

實測結果：**團員大多不開這個網站，也不看。** 所以「做一個漂亮的行程頁給全家看」這個前提是錯的。

真正在用的只有領隊與副領隊，而他們最需要的功能，現行版本一個都沒有：

| 現況 | 問題 |
|---|---|
| 每個行程 = 一個 HTML 檔，行程/成員/必買寫死成 JS 全域變數（`busan2026.html` 239 行資料） | 改一個時間要改原始碼、要 commit、要懂 git |
| `shared/app.js` 965 行，用瀏覽器內 Babel `fetch + eval` 編譯 | 慢、無法除錯、無法拆檔，改動風險高 |
| Firestore 只用在記帳/投票/勾選/留言 | **行程本體完全不能在網站上改** —— 這正是領隊唯一需要的能力 |
| 首頁是靜態卡片牆 | 沒有「下次幾時去」的決策工具，年曆是另一頁孤兒 |
| 站名綁死 Sun Family | 實際上大部分團是 Sun + Lau，另有 Mok Family |
| 無法把行程輕鬆傳給家人 | 領隊最後還是自己在 WhatsApp 手打一次 |

改版目標一句話：**讓領隊願意每年回來用第二次。**

---

## 2. 使用者與角色

| 角色 | 是誰 | 在做什麼 | 佔用時間 |
|---|---|---|---|
| **領隊** | SS、以及各家庭主揪 | 排行程、改行程、查資料、把行程傳出去 | 95% |
| **副領隊** | 協力規劃的家人 | 同上，權限相同 | |
| **團員** | 其他家人 | 出發前瞄一眼、旅途中查今日安排、勾必買、記帳 | 5% |
| **站長** | SS | 個人首頁：看假期、排請假、看自己所有行程 | |

**設計優先序：領隊 > 站長 > 團員。** 任何取捨衝突，以領隊順手為準。

---

## 3. 命名與網域

- **品牌**：爽爽 Songsong（粵拼 song2 song2）
- **主網域**：`songsong.sssuni.com`（Cloudflare Workers + Static Assets，照 sunhealth／siksik／setgo 的 `wrangler.jsonc` 模式）
  - 註：2026-08-31 你原本定的目標網址是 `suntrip.sssuni.com`。改版後名字換成 songsong，網址一併換；搬遷方式不變。
- **短址**：`song.sssuni.com` → 301 轉主網域
- **Repo**：`sssunwl/SunFamilyTrip` 改名 `sssunwl/songsong`（GitHub 會自動保留舊 repo 名轉址）
- **家庭代號**（原本想當站名的那些，降級成資料）：
  - `sunlau` — Sun & Lau Family（原 SLFT）
  - `mok` — Mok Family（原 MokFT）
  - 之後加家庭 = 加一筆資料，不改程式碼、不開新 repo

### 舊網址不能斷
現有 `sssunwl.github.io/SunFamilyTrip/trips/busan2026.html` 已經傳給家人。
→ 舊 repo 的 GitHub Pages **保留一個轉址頁**，指向新站對應行程；至少維持到 2027 年。

---

## 4. 資訊架構

```
/                                我的首頁（站長私人）
                                 └ 年曆 + 港台假期 + 請假攻略 + 個人行程

/f/<family>/                     家庭首頁
                                 └ 月曆（假期國家可加減）+ 行程入口 + 成員

/f/<family>/t/<trip>/            行程頁（團員視圖，唯讀）
/f/<family>/t/<trip>/edit        行程積木編輯器（需領隊登入）
/f/<family>/t/<trip>/guide       指南 & 必買
/f/<family>/t/<trip>/day/<n>     單日視圖（旅途中主要入口，可深連結）

/login                           領隊登入
```

例：`songsong.sssuni.com/f/sunlau/t/busan2026/`

**每個家庭有自己的連結** = `/f/<family>/`，可獨立傳給該家庭，看不到別家的行程。

---

## 5. 權限模型

三層，**不用 PIN，用 Firebase Auth**（理由見附錄 A）：

| 層 | 怎麼進 | 能做什麼 |
|---|---|---|
| 訪客（家人） | 直接開連結，免登入 | 讀行程/指南/必買；寫記帳、投票、勾必買、留言 |
| 領隊 | `/login` 輸入「家庭代號 + 密碼」 | 上列全部 + 建立/編輯/刪除行程、指南、必買、成員 |
| 站長 | 同上，用站長帳號 | 上列全部 + 個人首頁、建立新家庭 |

- 登入畫面只有兩格（家庭代號、密碼），前端把它拼成 `<family>@songsong.local` 丟 Firebase Auth Email/Password。使用者感受上就是「輸入家庭密碼」，實際上是真的帳密驗證。
- 帳號由 SS 在 Firebase Console 手動建立，不做自助註冊。
- Firestore Rules 以 `request.auth.uid` 比對 `families/{fid}.leaders[]`。
- 團員的免登入寫入用 Rules 嚴格限制：只能寫指定子集合、欄位白名單、字串長度上限、禁止刪除他人資料。

**個人首頁的隱私**：站點是公開的，所以未登入時 `/` 只顯示公眾假期年曆與請假攻略（這部分公開反而有用）；個人行程要登入站長帳號才載入，資料存 `users/{uid}`，Rules 限本人。

---

## 6. 資料模型（Firestore）

```
families/{familyId}
  name            "Sun & Lau Family"
  shortName       "SLFT"
  theme           { accent, bg }
  leaders         [uid, ...]
  members         [{ id, name, avatar, defaultRole }]      家庭常駐成員池
  holidayCountries ["HK","TW"]                             家庭月曆預設顯示
  createdAt, updatedAt

families/{familyId}/trips/{tripId}          ← 整份行程存一個 doc
  meta       { title, subtitle, city, country, coords{lat,lng}, currency,
               startDate, endDate, heroImg, photosUrl, emergency[], status }
  members    [{ id, name, avatar, role, excludeFromSplit }]   ← 每個行程可獨立設定
  days       [{ id, date, weekday, theme, highlights }]
  blocks     [{ ...見 §7.2 }]
  guide      [{ ...見 §7.5 }]
  version    number                                        ← 樂觀鎖
  updatedAt, updatedBy

families/{familyId}/trips/{tripId}/expenses/{id}    沿用現行
families/{familyId}/trips/{tripId}/polls/{id}       沿用現行
families/{familyId}/trips/{tripId}/notes/{id}       沿用現行
families/{familyId}/trips/{tripId}/tools/shopping   沿用現行（必買勾選）

families/{familyId}/availability/{entryId}  ← 家人檔期（見 §7.8）
  memberIds  [memberId]      誰
  from, to   ISO 日期         幾時到幾時
  kind       'trip' | 'busy' | 'free'
  label      "沖繩 · 自己去"
  note
  createdBy, createdAt

families/{familyId}/presets/{presetId}      家庭自訂積木範本
templates/{templateId}                      全站共用積木庫（唯讀）
users/{uid}/events/{eventId}                站長個人行程
```

**為什麼整份行程存一個 doc**：釜山行程 JSON 實測約 45KB，遠低於 Firestore 單 doc 1MB 上限。一次讀取、整份寫回，配 `version` 樂觀鎖（寫入前比對版本，不符就提示「有人剛改過，請重新載入」）。單一領隊編輯的場景這樣最簡單，省掉大量子集合同步邏輯。

---

## 7. 功能規格

### 7.1 我的首頁 `/`

- **年曆**：12 個月網格，一眼看完整年
- **假期上色**：香港、台灣（沿用 `holidays.json`，唯一來源仍是 `SoSolsunday/docs/data/holidays.json`）
- **請假攻略**：直接沿用現行 `calendar.html` 的 `findWindows()` 演算法 —— 這段已經寫好且驗過，**不要重寫**，只搬進新框架
- **個人行程**：登入後疊在年曆上（點日期新增/編輯），顏色與假期區隔
- **快速入口**：我的家庭、進行中/即將出發的行程
- 互動：hover 月份放大該月細節；點日期彈出當日詳情；請假攻略卡 hover 時在年曆上高亮對應區間

### 7.2 行程積木編輯器 `/edit` ★核心

這是整個改版的心臟。像 Scratch 一樣搬積木。

**版面**（桌面三欄）：
```
┌──────────┬────────────────────────┬──────────┐
│ 積木庫    │ 行程畫布                │ 屬性面板  │
│ 分類 tab  │ Day 1 │ Day 2 │ Day 3   │ 選中積木  │
│ 積木卡列表 │ ┌───┐  ┌───┐  ┌───┐    │ 的欄位    │
│ ＋自訂範本 │ │卡 │  │卡 │  │卡 │    │          │
│          │ └───┘  └───┘  └───┘    │          │
└──────────┴────────────────────────┴──────────┘
```
手機：積木庫收成底部抽屜，畫布單欄，屬性面板全螢幕 sheet。

**積木類型**（`templates` 集合，全站共用）：

| type | 名稱 | 預設時長 | 特有欄位 |
|---|---|---|---|
| `transport` | 交通 | 30m | from, to, mode(步行/地鐵/的士/巴士/火車/航班/船), fare |
| `food` | 餐飲 | 90m | mealType(早/午/晚/宵夜/咖啡), budget, needReserve |
| `sight` | 景點 | 120m | ticketPrice, needBooking, openHours |
| `shopping` | 購物 | 90m | budget, taxRefund |
| `hotel` | 住宿 | — | checkIn, checkOut, address, localAddress, directions |
| `rest` | 休息 | 60m | — |
| `free` | 自由時間 | 120m | — |
| `meetup` | 集合 | 15m | 集合點, 聯絡人 |
| `split` | **分隊** | — | 兩組（或多組）各自的成員與安排 |
| `todo` | 待辦提醒 | — | 提醒日期, 負責人 |
| `note` | 備註 | — | 純文字 |

> `split` 分隊積木是從釜山團真實需求長出來的：8/8 醫美組（5人）與帶 Han 組分開行動再會合。舊版只能寫在描述裡，新版要能結構化表達。

**共通欄位**：
```
{ id, type, dayId, order, time, durationMin, title, desc,
  place: { name, localName, mapUrl, lat, lng, placeId },
  assignees: [memberId],        // 空 = 全團
  warn: string|null,            // ⚠️ 提示（沿用現行常見的「大型超市週日公休」這類）
  images: [url],
  affiliate: { url, platform } | null }
```

**操作**：
- 從積木庫拖進某一天 → 落地成卡片，自動帶入預設時長與欄位模板
- 卡片可在同一天內拖拉排序、可跨天拖曳搬移
- 點卡片 → 右側屬性面板編輯；手機為全螢幕 sheet
- 卡片右上選單：複製、複製到其他天、另存為家庭範本、刪除
- **鍵盤/手機備援**：桌面 hover 出現上下移動箭頭；手機長按 200ms 啟動拖曳，另外提供「搬到 Day…」選單。**不得只有拖曳一種操作路徑**
- 自動排時間：改一張卡的時間後，可選「順延之後的卡」
- 整天複製：Day 標頭選單可「複製整天到…」「從其他行程匯入這天」

**技術**：`@dnd-kit`（touch 支援好、與 React 相容）。不用 HTML5 native DnD（手機不可靠）。

**儲存**：改動先進本地狀態，debounce 1.5 秒寫回 Firestore；頂部固定顯示「已儲存 / 儲存中 / 儲存失敗（重試）」。離線時擋住編輯並提示。

### 7.3 地點匯入 ★

領隊輸入框：**貼上店名 + Google Maps 連結**（手機分享出來的文字剛好就是這兩行）。

解析策略，依序嘗試，失敗就降級，**任何情況下都不會比現在差**：

1. **完整連結**（`google.com/maps/place/店名/@lat,lng,17z/...`）→ 純前端正則解析。**能取得什麼就填什麼**：Google 有 `/place`、`/search`、`?q=`、CID、座標分享等多種格式，不是每種都含真正的 Place ID，取不到就留空，不算失敗。零成本、零依賴。
2. **手機短連結**（`maps.app.goo.gl/xxx`）→ 前端 fetch 會被 CORS 擋，改打自架的 Cloudflare Worker（約 40 行，只做 follow redirect 回傳最終網址），再走第 1 步。Worker 免費額度 10 萬 req/日，這用量等於零成本。
3. **解析失敗** → 店名用貼上的文字，連結原樣保留當地圖按鈕（＝現行行為）。

自動填入：`place.name`、`place.localName`（連結內若有當地語言名）、`place.mapUrl`、`lat/lng`、`placeId`。營業時間、電話、評分留空手填。

**介面預留升級**：解析結果卡片留一顆「補齊詳細資料」按鈕，Phase 4 接 Google Places API 時直接接上，不改介面。

### 7.4 每日文字版複製 ★

每個 Day 標頭一顆「複製文字版」。輸出範例：

```
📅 8/6（四）Day 2 · 海雲台・Yi 生日🎂

10:00  海雲台 Blueline Park 膠囊列車
       尾浦站搭天空膠囊去青沙浦，靚景又唔使行。
       📍 해운대 블루라인파크 미포정거장
       🔗 https://maps.app.goo.gl/xxxx

12:30  海雲台午餐
       ...

⚠️ 旺季建議提早網上訂位
```

選項（記住上次選擇）：
- 精簡版（只有時間＋標題）／完整版（含描述）
- 含地圖連結 開／關
- 含 emoji 開／關（有些長輩的手機顯示會亂）
- 整趟複製／只複製這天

實作注意：iOS Safari 的 `navigator.clipboard.writeText` 必須在 user gesture 的同步流程內呼叫，**不能等 await 後才呼叫**，否則靜默失敗。備援：複製失敗時彈出可全選的 textarea。

### 7.5 指南 & 必買

資料結構：
```
{ id, category, name, localName, tag, note, desc,
  images: [url], showText,              // showText = 給店員看的當地語言
  buyable: bool,                        // true = 出現在必買勾選清單
  price: { amount, currency } | null,
  affiliate: { url, platform, disclosure } | null,
  source: "manual" | "csv" | "guide" }
```

**資料怎麼補**（這是你問的重點）：
- 逐件表單新增（有預設 emoji 選擇器、分類下拉）
- **CSV 匯入**：貼上或上傳表格一次補幾十件（現有釜山 39 件就是這樣的量級）
- 指南項目一鍵轉必買（`buyable: true`）
- 跨行程複製：「從釜山 2026 匯入必買清單」——藥妝、零食這類清單每次去韓國都能重用

**產品圖片從哪來、誰付儲存費**：
- Phase 2：貼圖片 URL（零成本）＋ 現有 `assets/busan/products/` 39 張留在 repo 不動
- **舊圖如何進新站（P3 前必須解決）**：新站只部署 `app/dist`，而 39 張圖在 repo 根目錄的 `assets/`。做法是在 build 前把 `assets/` 複製進 `app/public/assets/`，Vite 會自動帶進 `dist`，資料裡的 `/assets/busan/products/...` 路徑不用改。根目錄原圖保持不動（舊站還在用）
- Phase 3：開 Firebase Storage 上傳。前端上傳前先壓成 WebP、長邊 ≤1200px、≤200KB，一個行程 50 張約 10MB —— Storage 免費額度 5GB 用十年也用不完。**Blaze 方案要綁卡但免費額度內不扣款**，並設預算警報 US$1。
- 不做的事：不自動去抓別人網站的圖（版權與熱連結失效）。

**聯盟行銷**（補貼成本）：
- 每件商品可掛 `affiliate.url`，平台先支援 Amazon JP / 樂天 / Qoo10 / Shopee
- 景點與活動類積木可掛 Klook / KKday —— 對旅行工具來說票券佣金比商品實際
- **合規**：任何含 affiliate 的卡片底部固定顯示揭露文字「透過此連結購買，我可能獲得少量回饋，價格不變」。不可隱藏、不可只寫在條款頁
- 不因為有佣金就改變推薦排序；排序永遠依領隊自己排的順序

### 7.8 家人檔期 ★

**問題**：請假攻略算得出「港台都放假」的窗口，但算不出「那幾天 Lam 人在沖繩、Yi 要上班」。領隊排下一趟時，這才是真正卡住的資訊。

**做法**：家庭層面維護一份檔期表，任何人都可以登記某幾位家人某段日子的狀態。

```
{ memberIds: ['lam'], from: '2026-08-03', to: '2026-08-05',
  kind: 'trip', label: '沖繩 · 自己先去', note: '8/5 才同大隊會合' }
```

三種 `kind`：
- `trip` — 去旅行／人不在（最主要的用途）
- `busy` — 有事、請不到假、小朋友開學
- `free` — 特別得閒，反向標記（例如「這週我全放」）

**兩個月曆用不同密度顯示，這是刻意的**：

| 在哪 | 怎麼顯示 | 為什麼 |
|---|---|---|
| **家庭月曆**（`/f/<family>/`） | 日期格下方細色條，一人一條，跨日連成一段；hover 顯示「Lam · 沖繩 · 自己先去」 | 這裡在排一趟的細節，需要看到逐日誰在誰不在 |
| **月曆下方檔期列表** | 一列一筆，可編輯刪除 | 維護入口 |
| **我的首頁年曆**（`/`） | **不畫在日期格上**。改在旁邊的請假攻略卡下方標一行「⚠️ 這段有 2 人不在（Lam、Yi）」 | 年曆一格約 10px，塞人名會糊成一片；而且這裡在做的決定是「哪個窗口可行」，不是「某一天誰不在」 |

**請假攻略的交叉比對** ★ 是這功能真正的價值：算出來的每個窗口都要標明有幾人不在，而且**人不齊的窗口自動往後排**。日子再好、人不齊就沒用。

**還有一個用途**：開新行程挑成員時，若某成員在該行程日期內有 `trip`／`busy` 檔期，成員選單旁邊直接標衝突。

**誰可以寫**：領隊可寫全部。團員沿用現行「先揀返你係邊個」的信任模型，可以登記自己的檔期（跟記帳、留言同一層信任，不是認證）。Rules 用欄位白名單 + 長度上限限制。

**分期**：資料結構在 **P1** 就要建好（見 §6），介面在 **P4** 跟家庭月曆一起做。它不依賴編輯器，若你想提前單獨做也可以——但仍然不能插隊到 P2 前面。

### 7.6 家庭首頁 `/f/<family>/`

- **月曆**：可前後翻月，預設顯示香港假期
- **假期國家可加減**：勾選 chips（沿用 `calendar.html` 現有的 HOME/DEST chips 機制），選擇存進 `families/{fid}.holidayCountries`
- 該家庭的行程卡：即將出發 / 進行中 / 回憶錄
- 「排下一次」按鈕 → 開請假攻略，範圍限該家庭勾選的國家，並套用家人檔期（§7.8）
- 月曆下方：家人檔期列表 + 「登記檔期」按鈕
- 成員列（頭像 + 名字），領隊可編輯

### 7.7 行程頁（團員視圖）

保留現行版本裡真正有人用的東西，**不要為了改版把能用的砍掉**：
- 逐日行程（現行的 day tabs + 卡片，視覺重做）
- 出發倒數 / 旅程進行中 Day N
- 即時天氣與預報、匯率換算（現行 `useLiveWeather` / `useExchangeRates`）
- 記帳分帳、投票、回憶留言、必買勾選（Firestore 邏輯全部沿用）
- 當地語言發聲小幫手（`speakLocal`）
- 航班、住宿資訊卡
- 緊急電話

**旅途中預設入口是「今天」**：`/day/<n>`，開站自動跳到當日。

---

## 8. 設計方向

現行問題（你說的「Blogger 感」）：米色底 + 圓角白卡 + Playfair Display 標題 + 大量置中文字 + 卡片全部一樣大 —— 這是 2015 年部落格模板的長相。

新方向：

- **版式**：不對稱。左側資訊軸線對齊、右側留白；卡片大小依重要性分級（今天的行程 > 明天 > 之後）。禁止整頁置中。
- **字體**：標題與內文同一套無襯線（Noto Sans HK / Inter），靠字重與字級拉層次，不用襯線裝飾字。時間、金額、航班號用等寬字（tabular-nums）對齊。
- **顏色**：中性底（近白/近黑各一套，支援深色模式）＋ 每個家庭一個主色 ＋ 積木類型各自的語意色。語意色只用在小面積（左緣色條、icon、標籤），不鋪大色塊。
- **hover / 互動**（你要的「多點 Hover 多點互動」）：
  - 行程卡 hover：浮起 2px、左緣色條變寬、顯示快速操作（複製、編輯、地圖）
  - 積木庫卡 hover：顯示該類型會帶入哪些欄位的預覽
  - 日期 hover：年曆上高亮同一週、顯示該日 tooltip
  - 請假攻略卡 hover：年曆同步高亮該區間
  - 全站統一 transition 150ms ease-out；**所有 hover 效果都必須有 touch 對應行為**（點一下＝hover 態，再點＝進入）
  - `prefers-reduced-motion` 時關閉位移動畫
- **狀態要齊**：loading（骨架屏）、空狀態（「還沒有行程，從積木庫拖一個進來」）、錯誤（可重試）、離線 —— 現行版本這三種狀態全都沒有。
- **RWD**：320 / 768 / 1024 / 1440 四個斷點。手機是團員的主場、桌面是領隊的主場，兩邊都不能將就。
- **可及性**：對比度 ≥4.5:1；積木不可只靠顏色區分（一律配 icon + 文字）；焦點環可見；鍵盤可完成新增/排序/刪除。

---

## 9. 技術棧

| 層 | 選擇 | 理由 |
|---|---|---|
| 前端 | Vite + React + TypeScript + Tailwind | 跟 Syun 一致；取代現行的瀏覽器內 Babel `fetch+eval` |
| 動效 | Motion (framer-motion) | 跟 Syun 一致 |
| 拖曳 | `@dnd-kit` | touch 支援好、與 React 狀態相容 |
| 資料 | Firebase Firestore | 已在用、即時同步天生就有、免費額度足夠 |
| 認證 | Firebase Auth (Email/Password) | 見附錄 A |
| 圖片 | Firebase Storage（Phase 3） | 免費 5GB |
| 短連結解析 | Cloudflare Worker（約 40 行） | 免費額度 10 萬 req/日 |
| 部署 | Cloudflare Workers + Static Assets → `songsong.sssuni.com` | 沿用 sunhealth／siksik／setgo 已驗過的 `wrangler.jsonc` 模式 |
| 假期資料 | `holidays.json` 副本 | 唯一來源仍是 `SoSolsunday/docs/data/holidays.json` |

---

## 10. 遷移計畫

1. 寫一次性腳本，把 `trips/busan2026.html`、`trips/pattaya2026.html` 裡的 `ITINERARY` / `GUIDE_ITEMS` / `MEMBERS` / `TRIP_*` 轉成新 schema 的 JSON，匯入 Firestore
2. `assets/busan/products/` 39 張圖原地保留，資料裡改存新站的絕對路徑
3. 現行 Firestore `trips/{tripId}/...` 的記帳/投票/留言資料搬到 `families/sunlau/trips/{tripId}/...`
4. 舊 repo 的 GitHub Pages 保留轉址頁
5. **舊站在新站驗收通過前不下線**（2026-08-31 定調：搬完先 private，未搬唔好郁。當時曾提早關掉 Pages 並轉 private，隔日被要求還原）
6. 換 origin 後必須去 Firebase 專案 `sunfamily-trips` 的 **Authentication → Authorized domains 加新網址**，否則登入直接壞掉
7. 家人要重新「加到主畫面」、重新選身份（sunhealth 已經踩過這個坑）

---

## 11. 分期交付

| Phase | 內容 | 完成的標準 |
|---|---|---|
| **P1 骨架** | Vite 專案、路由、Firebase Auth、Firestore schema、資料遷移腳本、設計系統 tokens | 釜山與芭堤雅資料能在新站正確顯示（唯讀） |
| **P2 編輯器** ★ | 積木庫、拖拉畫布、屬性面板、儲存與樂觀鎖、成員設定、地點匯入（前端解析＋Worker） | 領隊能不碰程式碼，在手機與桌面各排出一整天行程 |
| **P3 傳播與內容** | 每日文字版複製、指南＆必買編輯、CSV 匯入、跨行程複製、Firebase Storage 上傳、affiliate 欄位與揭露 | 領隊排完能一鍵複製貼進 WhatsApp |
| **P4 曆與家** | 我的首頁年曆＋請假攻略＋個人行程、家庭月曆與國家加減、**家人檔期（§7.8）與攻略交叉比對** | 能回答「下次幾時去，而且誰去得成」 |
| **P5 打磨** | 深色模式、動效、空/錯/離線狀態、可及性、效能、舊站轉址 | 上線 `songsong.sssuni.com` |

P2 是價值分水嶺 —— **P1 沒做完不要碰 P2；P2 沒做完不要碰 P4**。

---

## 12. 明確不做

- 不做團員自助註冊、不做會員系統
- 不做即時協作編輯（同時多人改同一份行程）；用樂觀鎖擋住衝突就夠
- 不做原生 App
- 不做多語系介面（繁中／粵語為主）
- 不做行程自動生成（AI 排行程）—— 領隊要的是控制權不是驚喜
- 不自動抓取他站圖片
- 不做費用結算的金流

---

## 13. 已知風險與坑

1. **手機拖曳** 是最大實作風險。務必先做手機再做桌面，且一定要有非拖曳的備援操作路徑。
2. **iOS clipboard** 必須在 user gesture 同步流程內呼叫，不能 await 後才呼叫。
3. **舊資料本身有錯，遷移不會自動修**：芭堤雅的「泰國救護車 191」是錯的——191 是警察／緊急報案，泰國的救護車（EMS）是 **1669**。遷移刻意原樣保留，需人工更正。另外釜山指南 #15 的 tag 仍寫「8/7(五) 09:30」，但行程早已改到 8/8。緊急電話寫錯是會出事的那種錯，優先修。
4. **Firestore Rules** 是這次唯一的真安全邊界。團員免登入寫入必須逐欄位白名單，否則等於公開可寫資料庫。上線前要用 Firebase Rules 模擬器測過。
   **2026-09-08 已處理**：當日實測發現規則完全開放（未認證即可讀取全部資料、寫入未被擋），同日寫好過渡版 `firestore.rules` 並由 SS 在 Console 發布。發布後複驗四項全數通過：任意路徑讀取／寫入被擋、舊站需要的讀取仍通、既有記帳不可竄改。P1 的 `app/firestore.rules` 上線後取代它。
5. **lucide icon 崩潰**：現行 `shared/app.js` 用 `<span>` 外殼包 lucide 以避免 React `removeChild` 崩潰。新版改用 `lucide-react` 元件即可根治，但別忘了這個坑存在過。
6. **holidays.json 是副本**，改資料要回 `SoSolsunday/docs/data/holidays.json` 改，不要在這裡改。
7. **Firebase 免費額度**：Firestore 免費層每日 5 萬讀。整份行程存一個 doc 正是為了省讀取次數。編輯器要注意別在 `onSnapshot` 迴圈裡重複觸發寫入。
8. **舊網址**已經傳給家人，轉址頁不可少。
9. **P1 埋下的 Firestore 靜默 fallback（P2 開工第一件事就是拆掉）**：P1 的 `app/src/lib/db.ts` 在讀 Firestore 失敗時會 `catch {}` 然後改用版控裡的 `migration/out/*.json`。P1 未執行 import、需要畫面跑得起來，這在當下合理；但一旦 P2 開始寫入，**權限錯誤或斷線會被無聲吞掉並顯示過期的打包資料**，領隊會以為自己的修改消失了，或把舊資料當成現況。P2 必須改成：讀取失敗就明確報錯，fallback 只在開發模式下啟用且畫面上要有明顯標示。

10. **不要用 Cloudflare Access 保護個人首頁（2026-09-08 定案）**。原本考慮「只對 `/` 開 Access、`/f/**` 不開」，但在 SPA 上這是**假的安全邊界**：所有路由都由同一份 `index.html` 提供，家人載入公開的 `/f/sunlau/` 就已經拿到整個 app shell，可以在瀏覽器裡直接前端導航去 `/me`——Access 只擋得住那一次 HTML 請求，擋不住路由。另外 Access 的路徑比對是前綴式的，保護 `/` 等於保護全站，要放行家庭頁還得替 `/assets`、`/favicon.ico` 逐一開 Bypass，否則家人連 JS/CSS 都載不到。
   **採用做法**：全站不開 Access，個人隱私靠應用層 + Firestore Rules（見 §5）——個人行程存 `users/{uid}`，Rules 限本人讀寫。`/` 未登入只顯示公眾假期年曆與請假攻略（本來就是公開資料），登入站長帳號後才疊上個人行程。
   **日後要更硬的升級路徑**：把個人頁搬到**獨立 hostname**（例如 `me.sssuni.com`）再套 Access。獨立 hostname 沒有路徑前綴與 assets 的問題，那時 Access 才是真的邊界。不要在同一個 hostname 上用路徑做這件事。

---

## 附錄 A：為什麼不用純 PIN

你選的是「Firebase + 領隊 PIN」。實作上要說明一件事：**Firebase 沒有 PIN 這個概念**，硬做的話有三條路，兩條不安全：

- ❌ PIN 存在 Firestore 讓前端比對 → 團員讀得到 PIN，等於沒鎖
- ❌ PIN 雜湊後存 Firestore，Rules 比對 hash → 4~6 位數 PIN 的 hash 幾秒就能暴力破解
- ✅ **Firebase Auth Email/Password**，帳號由 SS 手動建立

所以採第三條，但**使用者體驗維持你要的「PIN 感」**：登入畫面只有「家庭代號」與「密碼」兩格，密碼可以就是 6 位數字，前端自動拼成 `<family>@songsong.local` 送去驗證。領隊完全不會知道背後是 email 帳密。

零後端、零成本、真安全，體驗不打折。

---

## 附錄 B：釜山 2026 已結束

釜山團 2026-08-05→08-10 已經走完；芭堤雅 2026-02-13→02-18 也已走完
（**更正**：本檔初稿誤記芭堤雅為「沒日期的草稿」，實際上 `trips/pattaya2026.html`
明確寫了六日行程與日期，遷移時以 HTML 為準）。
所以遷移進來的兩趟行程都屬「回憶錄」，新站上線時**不會有進行中的行程**——
這正好是驗收 P1 的乾淨條件：先確認舊資料顯示正確，再用一趟 2027 的新行程驗收 P2 編輯器。

---

## 附錄 C：P2 回報引出的規格補充（2026-09-09）

Codex 交付 P2 時挑出 16 個規格問題，以下是逐條裁決。**這些是規格的一部分，不是註解。**

### C1 新增積木的預設時間（原本沒定義）
從積木庫加一個積木時：
- 沿用**當天畫布順序最後一張**卡的「時間＋時長」作為新卡時間
- 「最後一張」指 `order` 最大者，**不是時間最晚者** —— 因為操作語意是「加到當天末尾」
- 那天還沒有積木 → `09:00`
- 最後一張沒有可解析的時間 → 留空，卡片顯示「未定時間」
- **跨午夜**：算出來超過 24:00 就留空並提示領隊自行處理。不要自動跳隔日（那會讓積木的 `dayId` 與顯示時間對不上），也不要顯示 `25:00`

### C2 `durationMin` 的 `—` 就是 `0`
SPEC §7.2 的表在 hotel / split / todo / note 寫「—」，實作上就是 `durationMin: 0`，型別註解已寫明「0 = 不佔時段」。這類積木不參與時間推算：**它後面那張卡沿用它的開始時間，不做加總。**

### C3 積木特有欄位的正式欄位名
§7.2 的表只寫了中文，補上 schema 名（P2 已實作，不要再改）：

| 中文 | 欄位名 | 型別 |
|---|---|---|
| 起點／終點／交通方式／車資 | `from` / `to` / `mode` / `fare` | string |
| 餐別／預算／需訂位 | `mealType` / `budget` / `needReserve` | string / string / boolean |
| 門票／需預約／營業時間 | `ticketPrice` / `needBooking` / `openHours` | string / boolean / string |
| 可退稅 | `taxRefund` | boolean |
| 入住／退房／地址／當地地址／交通指引 | `checkIn` / `checkOut` / `address` / `localAddress` / `directions` | string |
| 集合點／聯絡人 | `meetingPoint` / `contact` | string |
| 提醒日期／負責人 | `reminderDate` / `responsibleMemberIds` | string / string[] |

### C4 家庭成員加入行程時的角色
家庭池用 `defaultRole`，行程用 `role`。**加入行程時把 `defaultRole` 複製成 `role`**，之後改行程的 `role` 不回寫家庭池。

### C5 「複製整天到…」與「從其他行程匯入這天」
- 兩者都是**附加**到目標日的末尾，不覆蓋、不建立新 Day
- 只搬 `blocks`，不動目標日的 `date` / `theme` / `highlights`
- 目標日已有內容時要先提示「將附加 N 個積木到 Day X」再執行，避免不小心疊出重複行程

### C6 「順延之後的卡」的邊界
- 只平移**時間可解析**的後續卡；時間空白的卡跳過但不中斷後面的平移
- 平移後超過 24:00 的卡：停在該卡、把它的時間清空並提示，不要繼續往下推

### C7 建立行程的 create 規則必須帶 `version`
`allow create: if isLeader(fid)` 不夠 —— 沒有 `version` 的文件，之後的 update 規則（要求 `version + 1`）會因為 `resource.data.version` 不存在而永遠失敗，等於造出一份改不動的行程。規則已補 `version is number && version >= 1`，並加了兩組測試。

### C8 家庭範本存了但還不能用
P2 做了「另存為家庭範本」寫進 `families/{fid}/presets`，但積木庫還不會讀它。**這是刻意的分期**：P3 才做積木庫的「＋自訂範本」區塊。在那之前，範本是只進不出的。

### C9 建立與刪除行程的分期
SPEC §5 的權限表寫領隊可「建立/刪除行程」，但：
- **建立**：P2 沒有 UI，規則已放行（見 C7）。UI 在 P3
- **刪除**：規則明確 `allow delete: if false`。**整趟行程的刪除永遠不做** —— 誤刪一趟行程救不回來，要下架就把 `status` 改成封存

### C10 狀態的分期切法
SPEC §8 要求 loading／空／錯誤／離線四種狀態，§11 又把骨架屏放 P5，看起來衝突。切法是：
- **P2**：功能性狀態 —— 錯誤要能看懂並可重試、離線要擋住編輯。可以是樸素的文字
- **P5**：視覺打磨 —— 骨架屏、動效、空狀態的插圖與文案

### C11 讀取失敗的處理（HANDOFF §1 措辭不夠精確）
正確的意思是：**正式環境一律拋錯**，`import.meta.env.DEV` 下才用打包 JSON 兜底且畫面上要有明顯橫幅。兩者不是同時發生，是依環境二選一。
