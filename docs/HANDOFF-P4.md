# P4 派工單 · 曆與家（給 Codex）

> 上游規格：`docs/SPEC.md`，重點 §7.1、§7.6、§7.8，**以及附錄 C 與附錄 D**。
> 前一期：`docs/HANDOFF-P3.md`（已完成，commit eea013d）。
> **凡本檔沒寫的，就是本期不做。**

---

## 這一期的完成標準（只有一條）

**能回答「下次幾時去，而且誰去得成」。**

年曆算得出港台都放假的窗口，而且每個窗口都標明那段有誰不在。做到就停。

---

## 0. 硬性邊界

**不要做**：
- ❌ 骨架屏、動效、空狀態插圖、App Check、舊站轉址（P5）
- ❌ 積木上的 Klook／KKday affiliate 編輯介面（P5，見附錄 D8）
- ❌ Storage 孤兒檔案清理工具（P5 再評估，見附錄 D6）
- ❌ 刪除整趟行程（永遠不做，見附錄 C9）
- ❌ 接 Google Places API
- ❌ 不要改 repo 根目錄舊站檔案（`index.html`、`trips/`、`shared/`、`calendar.html`、`assets/`、根目錄 `firestore.rules`）
- ❌ `app/firestore.rules` 的舊站相容區必須原樣保留
- ❌ 不要 git commit、不要 git push
- ❌ 不要讀、複製或引用 `~/.config/songsong/service-account.json`

工作目錄一律 `app/`。跑 emulator 前 `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`。

---

## 1. 開工第一件事：補 P3 的兩個 schema 缺口

你 P3 回報的第 2 與第 19 條成立，裁決見 **SPEC 附錄 D2**。

`GuideItem` 補兩個欄位：
```ts
emoji?: string;    // 舊資料本來就有，P3 只能塞進 name
order?: number;    // 「排序依領隊自己排」需要可排序欄位
```

然後：
- 把 P3 塞進 `name` 的 emoji 拆回 `emoji` 欄位（寫一次性的資料修正，對 Firestore 現有的 50 + 15 筆指南執行）
- CSV 更新比對與跨行程重名判斷改用 **附錄 D3 的正規化**：去頭尾空白 → 全形轉半形 → 轉小寫 → 去除 emoji
- CSV 欄位加 `emoji`
- 指南列表加上下移動排序（拖曳可選，但**必須有按鈕備援**）

---

## 2. 補做 P3 沒能實測的三條驗收

你 P3 誠實回報第 3、5、6 條沒有親自走過 UI。本期一併補實測並回報結果：
- 新增必買 → 上傳圖片 → 勾選 → 讀回 `tools/shopping`
- 從釜山把必買清單匯入芭堤雅，重名被跳過並列出
- 積木庫的「＋ 自訂範本」能列出範本並加進當天

（**iOS 剪貼簿那條不用你做**，改由 SS 在 iPhone Safari 實機驗，見附錄 D13。）

---

## 3. 我的首頁 `/`（SPEC §7.1）

- **年曆**：12 個月網格，一眼看完整年，可切年份
- **假期上色**：香港、台灣。資料來自 `holidays.json`
- **請假攻略**：**直接搬 repo 根目錄 `calendar.html` 裡的 `findWindows()`**。
  那段演算法已經驗過、算得對，**照搬不要重寫**。只把它從那份 IIFE 抽成模組、
  補上型別，邏輯一行都不要改
- **個人行程**：登入站長帳號後才載入，資料在 `users/{uid}/events/{eventId}`，
  Rules 早已限本人。未登入時 `/` 只顯示假期年曆與請假攻略（那本來就是公開資料）
- 互動：hover 月份高亮該月、hover 攻略卡時年曆同步高亮該區間

`holidays.json` 要複製一份進 `app/public/`（跟 P3 的 `copy-assets.mjs` 同一個
prebuild 步驟處理），**唯一來源仍是 `SoSolsunday/docs/data/holidays.json`，不要在這裡改資料**。

---

## 4. 家庭月曆 `/f/:family/`（SPEC §7.6）

- 月曆可前後翻月，預設顯示 `families/{fid}.holidayCountries`（現為 `["HK","TW"]`）
- 假期國家用 chips 勾選加減，選擇存回 family document
- 行程期間在月曆上標示

---

## 5. 家人檔期 ★（SPEC §7.8）

資料結構 P1 已建好（`families/{fid}/availability/{entryId}`，型別 `AvailabilityEntry`），
現有一筆範例資料「Lam · 沖繩 · 自己先去」。本期做介面。

**三種 `kind`**：`trip`（去旅行／人不在）、`busy`（有事）、`free`（特別得閒）。

**顯示密度是刻意分開的**（SPEC §7.8 有表）：
| 在哪 | 怎麼顯示 |
|---|---|
| 家庭月曆 | 日期格下方細色條，一人一條，跨日連成一段；hover 顯示「Lam · 沖繩」 |
| 月曆下方列表 | 一列一筆，可編輯刪除 |
| **我的首頁年曆** | **不畫在日期格上**。改在請假攻略卡下方標「⚠️ 這段有 2 人不在（Lam、Yi）」 |

年曆一格約 10px，塞人名會糊成一片；而且首頁在做的決定是「哪個窗口可行」，
不是「某一天誰不在」。

**交叉比對才是重點**：請假攻略算出的每個窗口都要標明有幾人不在，而且
**人不齊的窗口自動往後排**。日子再好、人不齊就沒用。

**誰可以寫**：領隊可寫全部；家人沿用免登入的信任模型可登記自己的檔期
（同記帳、留言那層信任）。Rules 用欄位白名單 + 長度上限。

---

## 6. Firestore Rules

- `families/{fid}/availability/{id}`：公開讀；寫入走欄位白名單
  （`memberIds` / `from` / `to` / `kind` / `label` / `note` / `createdBy` / `createdAt`，
  `label` 與 `note` 各 ≤200 字，`memberIds` ≤20 個），免登入可新增與修改，
  刪除限領隊
- `families/{fid}` 的 `holidayCountries` 要能被領隊更新 —— 目前 `allow write: if false`，
  需要開一條只允許領隊、且只能改 `holidayCountries` 與 `members` 的規則
- 舊站相容區不動

測試要補：檔期的白名單、超長字串被擋、非領隊不可刪檔期、領隊可改 `holidayCountries`、
非領隊不可改 family 其他欄位。`npm run test:rules` 要真的跑過並貼出輸出。

---

## 7. 驗收標準（共 6 條）

1. `/` 未登入看得到 2027 年曆與港台假期上色、請假攻略有算出窗口
2. 登入站長帳號後，個人行程疊在年曆上；登出後消失
3. 家庭月曆能翻月、勾選國家後重新整理仍記得
4. 在家庭月曆登記一筆檔期，色條出現在正確日期區間
5. **請假攻略的窗口標出「這段有 N 人不在」，而且人不齊的排在後面**
6. `npm run test:rules` 全過、`npm run build` 通過

---

## 8. 交付時要回報的

1. 你實際建立／修改了哪些檔案
2. 上面 **6 條**驗收逐條的結果，加上 §2 那三條補測的結果
3. `npm run test:rules` 的實際輸出
4. **你認為規格或派工單寫錯、寫不清楚、或互相矛盾的地方**

第 4 項照舊是重點。P1 挑出 9 個、P2 挑出 16 個、P3 挑出 26 個，裁決分別寫在
SPEC 附錄 C 與 D。**P3 的第 1 條經查不成立**（你說新站沒有 shopping client、
規則全擋，但 `db.ts` 有 client、`firestore.rules` 也早有 `match /tools/{toolId}`
且限定 `shopping`，比要求更嚴格）—— 提醒你回報前先確認一下自己寫過什麼，
挑錯的成本比漏挑高。其餘 25 條大多成立，很有價值，這期一樣認真挑。
