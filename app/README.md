# 爽爽 Songsong · P1

本資料夾是與 repo 根目錄舊站隔離的新 Vite 應用程式。

```bash
npm install
npm run migration:extract
npm run dev
```

P2 編輯器需要 Firestore 與 Auth Emulator 時，用 `VITE_USE_FIREBASE_EMULATOR=true npm run dev`。短版 Google Maps 連結解析 Worker 位於 `workers/resolve-maps/`；部署後才把網址填入 `VITE_MAPS_RESOLVER_URL`，本 repo 不存密鑰。

`npm run migration:import` 需要 Firebase Admin service account，預設只會從 `~/.config/songsong/service-account.json` 讀取。建立金鑰前不要執行；金鑰不可放進 repo。

部署前執行 `npm run test:rules` 測試 Firestore Rules，再執行 `npm run deploy`。Cloudflare 自訂網域 `songsong.sssuni.com` 由 SS 手動設定，並須在 Firebase Authentication → Authorized domains 加入同一網域。
