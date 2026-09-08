# 爽爽 Songsong（原 SunFamilyTrip）

給**領隊**用的家庭旅行規劃工具。搬積木排行程，排完一鍵複製文字傳給家人。

## 唯一真相來源

**`docs/SPEC.md`**。任何實作以它為準；程式碼與它衝突時，先改 SPEC 再改程式碼。
本檔只放「工作規矩」，產品內容一律不要抄一份在這裡。

派工單：`docs/HANDOFF-P1.md`（已完成）、`docs/HANDOFF-P2.md`（編輯器，待開工）。每期一份，做完一期才寫下一份。

## 現在的狀態（2026-09-08）

改版規格已定稿，P1 唯讀骨架已完成並提交到 `main`／`origin/main`。`app/` 已包含 Vite + React + TypeScript 新站、Firebase Auth／Firestore、釜山與芭堤雅資料遷移及四條路由；build 通過，Firestore Emulator 9 項規則測試全過。根目錄舊站仍維持上線，尚未匯入正式 Firestore 或部署新站。

- `index.html`、`trips/*.html`、`shared/app.js` — 舊版，改版後會整組被取代，**先不要在上面加功能**
- `calendar.html` + `calendar-theme.css` + `holidays.json` — 亞洲假期年曆（2026-09-08 已入庫）。裡面的 `findWindows()` 請假攻略演算法**已驗過、要原樣搬到新站，不要重寫**
- `assets/busan/products/` — 39 張必買產品實拍圖，**保留不動**，新站沿用

舊資料的兩處錯誤已於 2026-09-08 修正（芭堤雅泰國救護車 191→**1669**，191 是警察；釜山指南 #15 的 tag 日期 8/7→8/8），修在舊 HTML 再重跑遷移，兩份 JSON 只有這兩處差異。

**P2 開工前的三件前置**：
1. 移除 `app/src/lib/db.ts` 的靜默 fallback（讀 Firestore 失敗會 `catch{}` 改用打包 JSON，寫入開始後會讓領隊以為改動消失）
2. 在 Firebase Console 建領隊帳號、把 UID 補進 `families/*.leaders`（現在是空陣列，等於沒人寫得了）
3. 備份舊 Firestore 後執行 `npm run migration:import`（需要 Admin service account 金鑰，放 `~/.config/songsong/`）

新站圖片部署方案（39 張舊產品圖怎麼進 `app/dist`）見 SPEC，P3 前要定。

## 規矩

- **實作派給 Codex，Claude 負責規劃與審查**（工作區慣例）。Codex 容易過度延伸專案規則，派工單一定要寫明確的「不要做」清單
- **新程式一律放 `app/` 子資料夾**，跟根目錄的舊站完全隔離——舊站還在 GitHub Pages 上跑，家人在用
- 分期交付見 SPEC §11。**P1 沒做完不要碰 P2；P2 沒做完不要碰 P4**
- `holidays.json` 是副本，唯一來源是 `SoSolsunday/docs/data/holidays.json`。要改假期資料回那邊改，不要在這裡改
- Firebase 的 `apiKey` 放公開 repo 沒問題（安全性靠 Firestore Rules，不是靠藏 key）。但**任何真正的密鑰一律放 `~/.config/songsong/`**
- 舊站 `sssunwl.github.io/SunFamilyTrip/` 已經傳給家人，**新站驗收通過前不下線**，之後也要留轉址頁到 2027
- 手機是團員的主場、桌面是領隊的主場。拖曳功能**先做手機再做桌面**，而且一定要有非拖曳的備援操作
- 跟 `sens/`、`seescent/`、`Syun/` 是不同專案，別混

## 相關專案

- `SoSolsunday/` — 假期資料唯一來源
- `Syun/`、`seescent/` — 同一套技術棧（Vite + React + Tailwind + Motion、Cloudflare Pages）可參考
