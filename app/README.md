# 爽爽 Songsong · P1

本資料夾是與 repo 根目錄舊站隔離的新 Vite 應用程式。

```bash
npm install
npm run migration:extract
npm run dev
```

`npm run migration:import` 需要 Firebase Admin service account，預設只會從 `~/.config/songsong/service-account.json` 讀取。建立金鑰前不要執行；金鑰不可放進 repo。

部署前執行 `npm run test:rules` 測試 Firestore Rules，再執行 `npm run deploy`。Cloudflare 自訂網域 `songsong.sssuni.com` 由 SS 手動設定，並須在 Firebase Authentication → Authorized domains 加入同一網域。
