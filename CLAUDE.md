# 爽爽 Songsong（原 SunFamilyTrip）

給**領隊**用的家庭旅行規劃工具。搬積木排行程，排完一鍵複製文字傳給家人。

## 唯一真相來源

**`docs/SPEC.md`**。任何實作以它為準；程式碼與它衝突時，先改 SPEC 再改程式碼。
本檔只放「工作規矩」，產品內容一律不要抄一份在這裡。

派工單：`docs/HANDOFF-P1.md`（P1 骨架，已可交給 Codex）。每期一份，做完一期才寫下一份。

## 現在的狀態（2026-09-08）

規格定稿中，**尚未動工**。repo 內現有的檔案全部是舊版：

- `index.html`、`trips/*.html`、`shared/app.js` — 舊版，改版後會整組被取代，**先不要在上面加功能**
- `calendar.html` + `calendar-theme.css` + `holidays.json` — 亞洲假期年曆（2026-09-08 已入庫）。裡面的 `findWindows()` 請假攻略演算法**已驗過、要原樣搬到新站，不要重寫**
- `assets/busan/products/` — 39 張必買產品實拍圖，**保留不動**，新站沿用

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
