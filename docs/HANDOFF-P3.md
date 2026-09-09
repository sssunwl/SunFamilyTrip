# P3 派工單 · 傳播與內容（給 Codex）

> 上游規格：`docs/SPEC.md`（唯一真相來源），重點 §7.4、§7.5、§7.2，**以及附錄 C**。
> 前一期：`docs/HANDOFF-P2.md`（已完成，commit 077f8f3 / d191c6b）。
> **凡本檔沒寫的，就是本期不做。**

---

## 這一期的完成標準（只有一條）

**領隊排完行程，按一下就能把當天貼進 WhatsApp 傳給家人。**

這是整個專案存在的理由——舊版最後領隊還是自己手打一次。做到這條就結束 P3。

---

## 0. 硬性邊界

**不要做**：
- ❌ 年曆、請假攻略、家庭月曆、家人檔期介面（P4）
- ❌ 骨架屏、動效、空狀態插圖、舊站轉址（P5）
- ❌ 刪除整趟行程的功能。**永遠不做**，見 SPEC 附錄 C9
- ❌ 接 Google Places API（那是 P4 之後，本期「補齊詳細資料」按鈕維持停用）
- ❌ 部署 resolve-maps Worker（SS 手動做）
- ❌ 不要改 repo 根目錄舊站檔案（`index.html`、`trips/`、`shared/`、`calendar.html`、根目錄 `firestore.rules`）
- ❌ `app/firestore.rules` 的舊站相容區必須原樣保留
- ❌ 不要 git commit、不要 git push
- ❌ 不要讀、複製或引用 `~/.config/songsong/service-account.json`

工作目錄一律 `app/`。跑 emulator 前 `export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`。

---

## 1. 每日文字版複製 ★ 本期核心

規格見 SPEC §7.4，輸出格式照那邊的範例。

放在**行程頁與編輯器都要有**（家人看的頁面領隊也會用）。每個 Day 標頭一顆「複製文字版」。

選項（用 `localStorage` 記住上次選擇）：
- 精簡版（只有時間＋標題）／完整版（含描述）
- 含地圖連結 開／關
- 含 emoji 開／關（長輩手機顯示會亂）
- 整趟複製／只複製這天

**實作坑（一定要照做）**：`navigator.clipboard.writeText` 在 iOS Safari 必須在使用者點擊的**同步流程內**呼叫。不可以 `await` 之後才叫，否則靜默失敗。文字要在點擊前就準備好，或用同步方式產生。備援：複製失敗時彈出一個可全選的 `textarea`，並提示「請長按選取複製」。

分隊積木要展開成各組：
```
09:30  分隊：醫美組 ／ 帶 Han 組
       ‧ 醫美組（5）：金陽濟皮膚科報到（Justin、Yi、Lam、媽媽×2）
       ‧ 自由組（3）：田浦咖啡街 brunch（Ricky、Pat、Han）
```

---

## 2. 指南＆必買編輯

資料結構見 SPEC §7.5 的 `GuideItem`，P1 已定義在 `app/src/types/trip.ts`，**不要改欄位名**。

- 逐件表單新增／編輯／刪除（emoji 選擇器、分類下拉）
- 指南項目一鍵轉必買（`buyable: true`）
- 必買清單的勾選沿用 P1 已遷移的 `tools/shopping`，**不要重做那套同步**
- 分類是自由文字＋既有分類的下拉建議，不要寫死列舉

---

## 3. CSV 匯入

一次補幾十件（釜山現有 39 件就是這個量級）。支援貼上或選檔。

欄位（第一列為標題列，缺的欄位留空即可）：
```
category, name, localName, tag, note, desc, imageUrl, showText, buyable, priceAmount, priceCurrency, affiliateUrl, affiliatePlatform
```

- `buyable` 接受 `true/false/1/0/是/否`
- 匯入前顯示預覽表格與「將新增 N 筆、更新 M 筆」，**要按確認才寫入**
- 以 `name` 比對既有項目決定新增或更新
- 解析失敗的列要逐列報錯，不要整批中止

---

## 4. 跨行程複製

「從其他行程匯入必買清單」——藥妝、零食這類清單每次去韓國都能重用。

語意同 SPEC 附錄 C5：**附加，不覆蓋**，重名的項目跳過並在結果裡列出跳過了哪些。

---

## 5. 圖片

**先確認 Firebase Storage 有沒有開**（見 §9 前置）。沒開就只做第 1 條，並在回報裡寫明。

1. **貼圖片 URL**（零成本，一定要做）
2. **上傳到 Firebase Storage**（Storage 已開才做）
   - 上傳前前端壓成 WebP、長邊 ≤1200px、≤200KB
   - 路徑 `families/{fid}/trips/{tid}/guide/{itemId}-{n}.webp`
   - Storage 規則：公開讀、領隊才可寫

**不要**自動去別的網站抓圖（版權與熱連結失效）。

### 舊產品圖怎麼進新站
39 張實拍圖在 repo 根目錄的 `assets/`，但新站只部署 `app/dist`。做法（SPEC §7.5 已定）：
- build 前把根目錄 `assets/` 複製進 `app/public/assets/`，Vite 會自動帶進 `dist`
- 資料裡的 `/assets/busan/products/...` 路徑不用改
- **根目錄原圖不動**（舊站還在用）
- 複製動作寫成 `npm run build` 的前置步驟，不要靠人手

---

## 6. 聯盟行銷欄位

`GuideItem.affiliate = { url, platform, disclosure }`。

- 平台先支援 Amazon JP / 樂天 / Qoo10 / Shopee
- **合規**：任何含 affiliate 的卡片底部**固定顯示**揭露文字「透過此連結購買，我可能獲得少量回饋，價格不變」。不可隱藏、不可只寫在條款頁、不可用小到看不見的字
- **排序永遠依領隊自己排的順序**，不因為有佣金就往前排

---

## 7. 積木庫讀家庭範本

P2 做了「另存為家庭範本」寫進 `families/{fid}/presets`，但積木庫還不會讀（SPEC 附錄 C8 註明這是刻意留給 P3 的）。

本期補上：積木庫底部一區「＋ 自訂範本」，列出該家庭的 presets，點了就跟內建積木一樣加進當天。範本可改名、可刪除。

---

## 8. 建立行程的 UI

SPEC 附錄 C9：規則已放行 create，但沒有 UI。本期補上。

- 家庭頁「＋ 開新行程」→ 填標題、城市、國家、起訖日、幣別
- **建立時必須帶 `version: 1`**，否則規則會擋（附錄 C7）
- 天數由起訖日自動生成 `days[]`，`blocks` 留空
- 可選「從既有行程複製結構」（只複製 days 與成員，不複製 blocks）

---

## 9. 前置條件（SS 做，做不了就回報並繼續其他項目）

1. **Firebase Storage 要不要開** —— 需要 Blaze 方案（綁卡，免費額度 5GB 內不扣款）。沒開就只做貼 URL
2. resolve-maps Worker 由 SS 部署後填 `VITE_MAPS_RESOLVER_URL`，本期不管

---

## 10. Firestore Rules 要更新

新增的寫入路徑要開給領隊，並保持欄位白名單：
- `families/{fid}/trips/{tid}` 的 `guide` 欄位（已含在整份 trip doc 的 update 規則裡，確認 version 遞增仍生效即可）
- `families/{fid}/presets/{presetId}` 改成領隊可 update / delete（P2 只開了 create）
- 舊站相容區不動

測試要補：領隊可改範本、非領隊不可、presets 刪除只有領隊能做。
`npm run test:rules` 要真的跑過並貼出輸出。

---

## 11. 驗收標準（共 7 條）

自己逐條走過，做不到的老實寫做不到：

1. 在手機上按「複製文字版」，貼進任何輸入框，格式正確且分隊有展開
2. 四個選項（精簡／地圖連結／emoji／整趟）都真的改變輸出
3. 新增一件必買、上傳或貼一張圖、勾選同步到 `tools/shopping` 正常
4. CSV 貼上 5 筆以上，預覽正確、確認後真的寫入、錯誤列有逐列報錯
5. 從釜山把必買清單匯入芭堤雅，重名項目被跳過並列出
6. 積木庫的「＋ 自訂範本」能列出 P2 存的範本並加進當天
7. `npm run test:rules` 全過、`npm run build` 通過

---

## 12. 交付時要回報的

1. 你實際建立／修改了哪些檔案
2. 上面 **7 條**驗收逐條的結果
3. `npm run test:rules` 的實際輸出
4. **你認為規格或派工單寫錯、寫不清楚、或互相矛盾的地方**

第 4 項照舊是重點。P1 你挑出 9 個、P2 挑出 16 個，其中大部分是規格層面真的寫錯，
已經分別寫進文件與 SPEC 附錄 C。這一期一樣認真挑。
