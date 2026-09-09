# 爽爽 Songsong（原 SunFamilyTrip）

給**領隊**用的家庭旅行規劃工具。搬積木排行程，排完一鍵複製文字傳給家人。

## 唯一真相來源

**`docs/SPEC.md`**。任何實作以它為準；程式碼與它衝突時，先改 SPEC 再改程式碼。
本檔只放「工作規矩」，產品內容一律不要抄一份在這裡。

派工單：`docs/HANDOFF-P1.md`、`docs/HANDOFF-P2.md`（皆已完成）、`docs/HANDOFF-P3.md`（傳播與內容，實作中）。每期一份。

Codex 每期回報的「規格哪裡寫錯」是這個分工最值錢的產出（P1 挑出 9 個、P2 挑出 16 個），裁決結果寫在 SPEC 附錄 C。派工單一定要保留這一項。

## 現在的狀態（2026-09-09）

改版規格已定稿，P1 唯讀骨架及 P2 行程積木編輯器已完成、驗收並提交到 `main`／`origin/main`。P2 包含手機與桌面編輯、跨天移動、屬性／成員面板、地點解析 Worker、樂觀鎖及 Firestore Rules；其後亦修正新增積木預設時間與 create 規則的 `version` 檢查。P3「傳播與內容」派工單、Firebase Storage 啟用步驟與 `asia-east1` 區域決策已入庫；P3 實作目前仍在未提交工作樹，尚未視為完成。根目錄舊站仍維持上線，新站尚未匯入正式 Firestore 或部署。

- `index.html`、`trips/*.html`、`shared/app.js` — 舊版，改版後會整組被取代，**先不要在上面加功能**
- `calendar.html` + `calendar-theme.css` + `holidays.json` — 亞洲假期年曆（2026-09-08 已入庫）。裡面的 `findWindows()` 請假攻略演算法**已驗過、要原樣搬到新站，不要重寫**
- `assets/busan/products/` — 39 張必買產品實拍圖，**保留不動**，新站沿用

舊資料的兩處錯誤已於 2026-09-08 修正（芭堤雅泰國救護車 191→**1669**，191 是警察；釜山指南 #15 的 tag 日期 8/7→8/8），修在舊 HTML 再重跑遷移，兩份 JSON 只有這兩處差異。

**目前下一步**：完成並驗收 P3 的文字複製、旅行指南／必買清單、CSV 匯入、家庭範本讀取與建立行程 UI；用 Storage Emulator 開發圖片功能，正式 bucket 不寫入。完成後須跑規則測試與 build，再決定提交；正式 Firestore 匯入、領隊 UID 設定及新站部署仍由 SS 處理。

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
