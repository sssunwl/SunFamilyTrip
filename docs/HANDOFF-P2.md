# P2 派工單 · 行程積木編輯器（給 Codex）

> 上游規格：`docs/SPEC.md`（唯一真相來源），重點是 §7.2、§7.3、§5、§6。
> 前一期：`docs/HANDOFF-P1.md`（已完成，commit 10c5310 / 78aabba / 2ed127c）。
> **凡本檔沒寫的，就是本期不做。**

---

## 這一期的完成標準（只有一條）

**領隊不碰程式碼，能在手機與桌面各排出一整天行程，關掉重開資料還在。**

做到這條就結束 P2，停下來等審查。

---

## 0. 硬性邊界

**不要做**：
- ❌ 文字版複製、指南／必買編輯、CSV 匯入、圖片上傳、affiliate（P3）
- ❌ 年曆、請假攻略、家庭月曆、家人檔期介面（P4）
- ❌ 深色模式打磨、骨架屏、舊站轉址（P5）
- ❌ 即時協作編輯（多人同時改同一份行程）。樂觀鎖擋住衝突就夠，見 §6
- ❌ AI 自動排行程
- ❌ 不要改動 repo 根目錄的舊站檔案（`index.html`、`trips/`、`shared/`、`calendar.html`）
- ❌ 不要 git commit、不要 git push
- ❌ 不要在 repo 裡放任何金鑰

---

## 1. 開工第一件事：拆掉靜默 fallback

`app/src/lib/db.ts` 目前長這樣：

```ts
} catch {
  // Fall through to deterministic local migration data.
}
return localTrips[tripId] ?? null;
```

P1 未匯入 Firestore、需要畫面跑得起來，這在當時合理。但 P2 開始寫入之後，
**權限錯誤或斷線會被無聲吞掉並顯示過期的打包資料**——領隊會以為自己的修改
消失了，或把舊資料當成現況。

改成：
- 讀取失敗一律往上拋，畫面顯示明確錯誤與重試按鈕（錯誤訊息要說人話，例如
  「連不上資料庫，請檢查網路」／「沒有編輯權限，請重新登入」）
- 打包 JSON 的 fallback 只在 `import.meta.env.DEV` 下啟用，且畫面上方要有
  明顯橫幅寫「開發模式：正在使用本機遷移資料，不是線上資料」
- 正式 build 不得包含那兩份 JSON（順帶把 bundle 從 917KB 減下來）

---

## 2. 前置條件（不是你做的，做不了就回報並停）

這兩項由 SS 完成，你開工前先確認：
1. Firebase Console 已建立領隊帳號，UID 已寫進 `families/{fid}.leaders[]`
2. `npm run migration:import` 已執行，Firestore 有 `families/sunlau`、
   `families/mok` 與兩趟行程

**如果 Firestore 還是空的，不要自己跑 import**（需要 Admin 金鑰）。
改用 Firestore Emulator 開發，並在回報裡寫明你是用模擬器驗收的。

---

## 3. 權限（接上 P1 已有的登入頁）

- 未登入：行程頁維持唯讀，看不到編輯入口
- 已登入且 `uid ∈ family.leaders`：行程頁出現「編輯」按鈕，可進 `/edit`
- 已登入但不在 leaders：顯示「你不是這個家庭的領隊」，不給編輯
- 直接打 `/edit` 網址但無權限 → 導回唯讀頁並提示

### Firestore Rules 要更新
`app/firestore.rules` 目前是「讀開放、寫全關」。本期改成：

```
match /families/{fid}/trips/{tid} {
  allow read: if true;
  allow update: if isLeader(fid)
                && request.resource.data.version == resource.data.version + 1;
  allow create: if isLeader(fid);
  allow delete: if false;          // 刪除行程本期不做
}
function isLeader(fid) {
  return request.auth != null
      && request.auth.uid in get(/databases/$(database)/documents/families/$(fid)).data.leaders;
}
```

**舊站相容區（根層 `trips/**`）必須原樣保留**，那是還在線上的舊站在用的，
刪掉會把家人的記帳／留言／必買勾選整組打死。

測試要補：領隊可寫、非領隊不可寫、version 沒遞增要被擋、舊站區塊行為不變。
`npm run test:rules` 要真的跑過（本機已裝 openjdk，keg-only，跑之前先
`export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`）。

---

## 4. 編輯器版面 `/f/:family/t/:trip/edit`

桌面三欄：

```
┌──────────┬────────────────────────┬──────────┐
│ 積木庫    │ 行程畫布                │ 屬性面板  │
│ 分類列表  │ Day 分頁 + 積木卡        │ 選中積木  │
│          │                        │ 的欄位    │
└──────────┴────────────────────────┴──────────┘
```

手機：積木庫收成底部抽屜，畫布單欄，屬性面板改全螢幕 sheet。

**先做手機再做桌面。** 手機是最難的，先做完手機能用，桌面自然成立；反過來
一定會做出手機上不能用的東西。

---

## 5. 積木

11 種類型與各自的預設時長、特有欄位見 SPEC §7.2 的表。型別 `Block` 在 P1
已定義好（`app/src/types/trip.ts`），**不要改欄位名**。

**操作路徑（每一項都必須有兩條路，不得只有拖曳）**：

| 動作 | 拖曳路徑 | 備援路徑 |
|---|---|---|
| 加積木 | 從積木庫拖進某一天 | 點積木庫項目 → 加到當前天末尾 |
| 同天排序 | 拖卡片上下 | 卡片上的 ▲▼ 按鈕 |
| 跨天搬移 | 拖到別的 Day | 卡片選單「搬到 Day…」 |
| 刪除 | — | 卡片選單「刪除」（要二次確認） |

拖曳用 `@dnd-kit`。**不要用 HTML5 native drag and drop**，手機上不可靠。
桌面上 ▲▼ 平常隱藏、hover 才出現；手機上一律顯示。

其他：
- 卡片選單另有「複製」「複製到其他天」「另存為家庭範本」
- 改一張卡的時間後，提供「順延之後的卡」選項（不要自動做，要問）
- Day 標頭選單：「複製整天到…」「從其他行程匯入這天」「加一天」「刪一天」

---

## 6. 儲存與樂觀鎖

- 改動先進本地狀態，**debounce 1.5 秒**寫回 Firestore
- 每次寫入 `version` 遞增、更新 `updatedAt` / `updatedBy`
- 寫入前比對 `version`：不符就不要覆蓋，顯示「有人剛改過這份行程，請重新載入」
  並提供重新載入按鈕。**不要自動合併**
- 頂部固定顯示狀態：`已儲存 · <相對時間>` / `儲存中…` / `儲存失敗（重試）`
- 離線時擋住編輯並提示，不要讓人白改一輪

---

## 7. 屬性面板

選中積木後可編輯：時間、時長、標題、描述、地點、負責成員（`assignees`）、
⚠️ 提示（`warn`）。

- 時長是分鐘數，要能直接輸入，不要只給預設值。**P1 遷移用時間差推算並截在
  240 分，那是推算不是真實時長**，領隊要能改
- `assignees` 空 = 全團，UI 上要講清楚
- `split` 分隊積木的面板不一樣：可以加／刪組，每組有名稱、說明、成員多選。
  釜山 8/8 的醫美組 vs 帶 Han 組就是這個場景，可以拿來當驗收案例
  （P1 的遷移沒有把 `e16`/`e17` 結構化成 `groups`，本期用編輯器手動轉一次，
  當作這功能的第一個真實測試）

---

## 8. 成員設定

行程層級的成員可獨立於家庭成員池設定（`Trip.members`）：
- 從家庭成員池勾選誰參加這趟
- 可改這趟的顯示名稱、頭像 emoji、`role`、`excludeFromSplit`
- 移除成員時，若他仍是某些積木的 `assignees`，要提示會一併移除

---

## 9. 地點匯入（SPEC §7.3）

輸入兩格：店名、Google Maps 連結。解析依序嘗試，**任何情況都不能比現在差**：

1. **完整連結**（`google.com/maps/place/店名/@lat,lng,17z/...`）
   → 純前端正則解析出店名、座標、Place ID。零成本
2. **手機短連結**（`maps.app.goo.gl/xxx`）
   → 前端 fetch 會被 CORS 擋。寫一個 Cloudflare Worker（約 40 行，只做
   follow redirect 回傳最終網址），再走第 1 步。Worker 放
   `app/workers/resolve-maps/`，**你只要寫好並準備 wrangler 設定，不要部署**
3. **解析失敗** → 店名用貼上的文字，連結原樣保留當地圖按鈕（＝現行行為）

解析結果卡片要留一顆「補齊詳細資料」按鈕（**本期只放按鈕、不接 API**），
P4 之後接 Google Places 用。

---

## 10. 驗收標準（共 8 條）

自己走過一遍，這些都要成立：
1. 手機（375px）上能加一個積木、換順序、跨天搬、改時間、刪掉
2. 桌面上同樣的操作都能做，而且拖曳能用
3. 關掉瀏覽器重開，改動還在（真的寫進 Firestore 或模擬器）
4. 開兩個分頁同時改同一天，第二個存檔時要看到「有人剛改過」而不是覆蓋
5. 未登入看不到編輯入口；非領隊帳號進不了 `/edit`
6. 貼一條完整 Google Maps 網址能解析出座標並加成積木
7. `npm run test:rules` 全過
8. `npm run build` 通過，bundle 不含 migration JSON

---

## 11. 交付時要回報的

1. 你實際建立／修改了哪些檔案
2. 上面 8 條驗收你逐條的結果（做不到的老實寫做不到）
3. `npm run test:rules` 的實際輸出
4. **你認為規格或派工單寫錯、寫不清楚、或互相矛盾的地方**

第 4 項一定要寫。P1 你挑出九個矛盾，其中七個是規格層面的錯，那是這個
分工最有價值的產出。不要自己猜著補。
