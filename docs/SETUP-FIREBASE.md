# Firebase 前置設定（P2 開工前）

> 這份是 SS 手動做的部分，Codex 做不了（需要 Console 權限與金鑰）。
> 順序不能換：**建帳號 → 匯入資料 → 部署規則**。

---

## 第 1 步 · 開啟 Email/Password 登入方式

專案 `sunfamily-trips` 從來沒用過 Auth，要先把登入方式打開。

1. 開 https://console.firebase.google.com/project/sunfamily-trips/authentication
2. 第一次進來會看到「開始使用」，按下去
3. 上方分頁選 **Sign-in method**（登入方式）
4. 找到 **電子郵件/密碼**，點進去 → 第一個開關打開（第二個「電子郵件連結」不用開）→ 儲存

---

## 第 2 步 · 建立領隊帳號，拿到 UID

登入頁的兩格「家庭代號 + 密碼」，前端會拼成 `<家庭代號>@songsong.local` 再送去驗證
（見 `app/src/lib/auth.ts`）。所以帳號的 email 必須照這個格式。

1. 同一頁上方分頁選 **Users**（使用者）
2. 按 **新增使用者**
3. 電子郵件填 `sunlau@songsong.local`
4. 密碼自己定，**至少 6 個字元**。可以就是一組數字，領隊感受上就是「家庭密碼」
5. 按新增
6. 在使用者列表那一列，把 **使用者 UID** 複製起來（28 個字元左右的亂碼）——下一步要用

> 如果 Console 不接受 `.local` 結尾的 email：改用 `sunlau@songsong.sssuni.com`
> （你自己的網域、不會真的收信），並同步把 `app/src/lib/auth.ts` 裡的
> `@songsong.local` 改成 `@songsong.sssuni.com`。兩邊必須一致。

Mok 家之後要開的話，同樣方式建 `mok@songsong.local` 就好。

---

## 第 3 步 · 產生 Admin 金鑰

匯入腳本要用 Firebase Admin SDK 寫資料，需要一把服務帳戶金鑰。

1. 開 https://console.firebase.google.com/project/sunfamily-trips/settings/serviceaccounts/adminsdk
2. 按 **產生新的私密金鑰** → 確認 → 瀏覽器會下載一個 `sunfamily-trips-firebase-adminsdk-xxxxx.json`
3. 搬到工作區外的設定目錄並鎖權限：

```bash
mkdir -p ~/.config/songsong && mv ~/Downloads/sunfamily-trips-firebase-adminsdk-*.json ~/.config/songsong/service-account.json && chmod 600 ~/.config/songsong/service-account.json
```

⚠️ **這把金鑰等於整個資料庫的最高權限，絕對不能進 repo。** 放 `~/.config/songsong/`
就是為了確保它在工作區外面。萬一不小心外洩，回同一頁把該金鑰撤銷再產生新的。

---

## 第 4 步 · 匯入資料

把第 2 步拿到的 UID 換進去執行：

```bash
SONGSONG_CONFIRM_IMPORT=1 SONGSONG_LEADER_UID=貼上你的UID npm run migration:import
```

腳本會做三件事：
1. **先把現有 Firestore 整份備份**到 `~/.config/songsong/backup-<今天日期>/firestore.json`
2. 建立 `families/sunlau`（含領隊 UID、成員、假期國家）與 `families/mok`
3. 寫入兩趟行程，並把舊站的記帳／投票／留言／必買勾選複製到新結構底下

`SONGSONG_CONFIRM_IMPORT=1` 是刻意的防呆，少了它腳本會直接拒絕執行。

跑完會印出備份路徑與領隊 UID。**如果印出「(空，沒人能編輯)」，代表 UID 沒帶進去，
重跑一次。**

---

## 第 5 步 · 部署新規則

現在線上跑的是根目錄 `firestore.rules`（過渡版），它只放行舊站的 `trips/**`，
**看不到剛匯入的 `families/**`**。所以匯入完一定要把新規則部署上去。

1. 開 https://console.firebase.google.com/project/sunfamily-trips/firestore/rules
2. 把 `app/firestore.rules` 整份內容貼上去，取代原本的
3. 按 **發布**

`app/firestore.rules` 裡面已經包含舊站相容區，**舊站不會壞**。

貼上去之前可以先本機跑一次測試確認：

```bash
cd /Users/sws/Sun/Claude/SunFamilyTrip/app && export PATH="/opt/homebrew/opt/openjdk/bin:$PATH" && npm run test:rules
```

---

## 第 6 步 · 驗收

```bash
cd /Users/sws/Sun/Claude/SunFamilyTrip/app && npm run dev
```

開瀏覽器確認：
- `/` 兩個家庭連結都點得進去（Mok 是空的但不該是死連結）
- `/f/sunlau/` 看得到釜山與芭堤雅兩趟
- 行程內容正常顯示
- `/login` 用 `sunlau` + 你設的密碼登入得了

舊站也去看一眼還活著：https://sssunwl.github.io/SunFamilyTrip/trips/busan2026.html

六步都過了，P2 就可以開工。

---

## 第 7 步 · 開啟 Cloud Storage（P3 需要）

2026-09-09 實測：`sunfamily-trips` 的 Storage **尚未啟用**（bucket 回 404）。
P3 的「領隊上傳產品圖」要用到它。

1. 開 https://console.firebase.google.com/project/sunfamily-trips/storage
2. 按「**開始使用**」
3. 安全規則選「**以正式版模式啟動**」（鎖定）——規則之後由 `app/storage.rules` 管
4. **選位置**：建議 `asia-northeast1`（東京）。家人在港／台／日，東京延遲最低
   ⚠️ **位置一旦選定不能改**，也不能搬 bucket，選錯只能重開專案
5. 這時會要求升級到 **Blaze 方案**（需要綁信用卡）

### 關於 Blaze 的費用
- Storage 免費額度 **5GB 儲存 + 每日 1GB 下載**。一趟行程 50 張壓過的 WebP 約 10MB，用十年也用不完
- 但 Blaze 是「用多少算多少」，**一定要設預算警報**：
  https://console.cloud.google.com/billing/budgets?project=sunfamily-trips
  → 建立預算 → 金額設 **US$1** → 勾選達到 50%／90%／100% 寄信通知
- 這個警報不會自動停用服務，只會寄信。但以這個用量，正常情況永遠不會觸發

開好之後跟 Claude 說一聲，會用 REST 驗證 bucket 真的能用。
