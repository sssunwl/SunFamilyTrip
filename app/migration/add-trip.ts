// 只寫入單一趟行程，唔會掂 families doc、leaders 或者其他行程。
// 用法：SONGSONG_CONFIRM_IMPORT=1 npm run migration:add-trip -- taipei2026
//
// 同 import.ts 嘅分別：import.ts 係一次性全量遷移，會重寫所有行程同家庭文件；
// 呢個係日常加一趟行程用，行程已經存在就會停低，除非畀 SONGSONG_OVERWRITE=1。
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';
import type { TripDocument } from '../src/types/legacy';

if (process.env.SONGSONG_CONFIRM_IMPORT !== '1') {
  throw new Error('為避免誤寫，請以 SONGSONG_CONFIRM_IMPORT=1 執行。');
}

const tripId = process.argv[2];
if (!tripId) throw new Error('請指定行程 id，例如：npm run migration:add-trip -- taipei2026');

const familyId = process.env.SONGSONG_FAMILY_ID ?? 'sunlau';
const migrationDir = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.join(os.homedir(), '.config', 'songsong');
const credentialPath = process.env.SONGSONG_SERVICE_ACCOUNT
  ? path.resolve(process.env.SONGSONG_SERVICE_ACCOUNT)
  : path.join(configDir, 'service-account.json');

const trip = JSON.parse(
  await readFile(path.join(migrationDir, 'out', `${tripId}.json`), 'utf8'),
) as TripDocument;

const serviceAccount = JSON.parse(await readFile(credentialPath, 'utf8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ref = db.collection('families').doc(familyId).collection('trips').doc(tripId);
const existing = await ref.get();

if (existing.exists) {
  const backupDir = path.join(configDir, `backup-${new Date().toISOString().slice(0, 10)}`);
  await mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${familyId}-${tripId}.json`);
  await writeFile(backupPath, `${JSON.stringify(existing.data(), null, 2)}\n`, 'utf8');
  if (process.env.SONGSONG_OVERWRITE !== '1') {
    throw new Error(
      `families/${familyId}/trips/${tripId} 已經存在（version ${existing.data()?.version}）。\n` +
      `現有內容已備份到 ${backupPath}。\n` +
      '確定要蓋走的話，加 SONGSONG_OVERWRITE=1 再跑一次。',
    );
  }
  console.log(`⚠️  覆寫現有行程，舊版已備份：${backupPath}`);
}

const family = await db.collection('families').doc(familyId).get();
if (!family.exists) {
  throw new Error(`families/${familyId} 未建立，請先跑一次 migration:import。`);
}

await ref.set(trip);
console.log(`已寫入 families/${familyId}/trips/${tripId}（${trip.meta.title}，${trip.meta.startDate} ~ ${trip.meta.endDate}）`);
console.log(`領隊 UID：${(family.data()?.leaders ?? []).join(', ') || '(空，冇人編輯得)'}`);
