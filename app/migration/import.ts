import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin';
import type { TripMember } from '../src/types/trip';
import type { TripDocument } from '../src/types/legacy';

if (process.env.SONGSONG_CONFIRM_IMPORT !== '1') {
  throw new Error('為避免誤寫，請確認備份與目標專案後以 SONGSONG_CONFIRM_IMPORT=1 執行。');
}

const migrationDir = path.dirname(fileURLToPath(import.meta.url));
const configDir = path.join(os.homedir(), '.config', 'songsong');
const credentialPath = process.env.SONGSONG_SERVICE_ACCOUNT
  ? path.resolve(process.env.SONGSONG_SERVICE_ACCOUNT)
  : path.join(configDir, 'service-account.json');

const serviceAccount = JSON.parse(await readFile(credentialPath, 'utf8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

type BackupDocument = {
  path: string;
  data: FirebaseFirestore.DocumentData;
};

async function collectDocument(
  document: DocumentReference,
  output: BackupDocument[],
) {
  const snapshot = await document.get();
  if (snapshot.exists) output.push({ path: snapshot.ref.path, data: snapshot.data() ?? {} });
  const children = await document.listCollections();
  for (const child of children) {
    const childDocs = await child.listDocuments();
    for (const childDoc of childDocs) await collectDocument(childDoc, output);
  }
}

async function backupFirestore(firestore: Firestore) {
  const documents: BackupDocument[] = [];
  const roots = await firestore.listCollections();
  for (const root of roots) {
    const rootDocs = await root.listDocuments();
    for (const rootDoc of rootDocs) await collectDocument(rootDoc, documents);
  }

  const day = new Date().toISOString().slice(0, 10);
  const backupDir = path.join(configDir, `backup-${day}`);
  await mkdir(backupDir, { recursive: true });
  await writeFile(
    path.join(backupDir, 'firestore.json'),
    `${JSON.stringify(documents, null, 2)}\n`,
    'utf8',
  );
  return backupDir;
}

async function readTrip(id: string): Promise<TripDocument> {
  const content = await readFile(path.join(migrationDir, 'out', `${id}.json`), 'utf8');
  return JSON.parse(content) as TripDocument;
}

async function copyLegacySubcollections(tripId: string) {
  for (const collectionName of ['expenses', 'polls', 'notes', 'tools']) {
    const source = await db.collection('trips').doc(tripId).collection(collectionName).get();
    for (const legacyDoc of source.docs) {
      await db
        .collection('families').doc('sunlau')
        .collection('trips').doc(tripId)
        .collection(collectionName).doc(legacyDoc.id)
        .set(legacyDoc.data());
    }
  }
}

const backupDir = await backupFirestore(db);
const trips = await Promise.all([readTrip('busan2026'), readTrip('pattaya2026')]);
const members = Array.from(
  new Map(
    trips.flatMap((trip) => trip.members).map((member) => [member.id, member]),
  ).values(),
) as TripMember[];

// 領隊 UID 由環境變數帶入。留空的話沒有人寫得了行程，P2 開不了工。
const leaders = (process.env.SONGSONG_LEADER_UID ?? '')
  .split(',').map((x) => x.trim()).filter(Boolean);
if (leaders.length === 0) {
  console.warn('⚠️  沒有給 SONGSONG_LEADER_UID，leaders 會是空陣列，之後沒有人能編輯行程。');
}

await db.collection('families').doc('sunlau').set({
  name: 'Sun & Lau Family',
  shortName: 'SLFT',
  theme: { accent: '#0B6E63', bg: '#E8ECEB' },
  leaders,
  members,
  holidayCountries: ['HK', 'TW'],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

// 首頁要列兩個家庭，不建立的話 Mok 那條是死連結
await db.collection('families').doc('mok').set({
  name: 'Mok Family',
  shortName: 'MokFT',
  theme: { accent: '#8C5A3C', bg: '#EFEAE5' },
  leaders,
  members: [],
  holidayCountries: ['HK'],
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

for (const [index, tripId] of ['busan2026', 'pattaya2026'].entries()) {
  await db.collection('families').doc('sunlau').collection('trips').doc(tripId).set(trips[index]);
  await copyLegacySubcollections(tripId);
}

await db.collection('families').doc('sunlau').collection('availability').doc('lam-okinawa-2026').set({
  memberIds: ['lam'],
  from: '2026-08-03',
  to: '2026-08-05',
  kind: 'trip',
  label: '沖繩 · 自己先去',
  note: '8/5 才同大隊會合',
  createdBy: 'migration',
  createdAt: Date.now(),
});

console.log(`備份完成：${backupDir}`);
console.log(`領隊 UID：${leaders.length ? leaders.join(', ') : '(空，沒人能編輯)'}`);
console.log('Firestore 遷移完成。');
