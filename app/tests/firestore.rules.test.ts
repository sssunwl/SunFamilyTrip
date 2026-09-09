import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  environment = await initializeTestEnvironment({
    projectId: 'sunfamily-trips',
    firestore: {
      host: '127.0.0.1',
      port: Number(process.env.FIRESTORE_RULES_TEST_PORT ?? 8080),
      rules,
    },
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe('P2 Firestore rules', () => {
  const leaderUid = 'iFT5Ppx7EPcJoSA13DUN2mWaIGu2';

  beforeAll(async () => {
    await environment.withSecurityRulesDisabled(async (ctx) => {
      const raw = ctx.firestore();
      await setDoc(doc(raw, 'families/sunlau'), { leaders: [leaderUid], name: 'Sun & Lau Family' });
      await setDoc(doc(raw, 'families/sunlau/trips/busan2026'), { version: 1, title: 'Busan' });
    });
  });

  it('allows public reads from families and trip subcollections', async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau')));
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau/trips/busan2026')));
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau/trips/busan2026/notes/a')));
  });

  it('領隊可建立行程，非領隊不可建立或修改', async () => {
    const publicDb = environment.unauthenticatedContext().firestore();
    const leaderDb = environment.authenticatedContext(leaderUid).firestore();
    const memberDb = environment.authenticatedContext('member').firestore();
    await assertFails(setDoc(doc(publicDb, 'families/sunlau'), { name: 'changed' }));
    await assertSucceeds(setDoc(doc(leaderDb, 'families/sunlau/trips/new-trip'), { version: 1 }));
    await assertFails(setDoc(doc(memberDb, 'families/sunlau/trips/member-trip'), { version: 1 }));
    await assertFails(updateDoc(doc(memberDb, 'families/sunlau/trips/busan2026'), { version: 2 }));
  });

  it('領隊更新時 version 必須剛好遞增 1', async () => {
    const leaderDb = environment.authenticatedContext(leaderUid).firestore();
    await assertFails(updateDoc(doc(leaderDb, 'families/sunlau/trips/busan2026'), { version: 1, title: 'no increment' }));
    await assertFails(updateDoc(doc(leaderDb, 'families/sunlau/trips/busan2026'), { version: 3, title: 'skip' }));
    await assertSucceeds(updateDoc(doc(leaderDb, 'families/sunlau/trips/busan2026'), { version: 2, title: 'updated' }));
  });

  it('行程不可刪除，子集合仍不可由領隊任意寫入', async () => {
    const leaderDb = environment.authenticatedContext(leaderUid).firestore();
    await assertFails(deleteDoc(doc(leaderDb, 'families/sunlau/trips/busan2026')));
    await assertFails(setDoc(doc(leaderDb, 'families/sunlau/trips/busan2026/notes/a'), { text: 'x' }));
  });

  it('領隊可建立家庭範本，非領隊不可', async () => {
    const leaderDb = environment.authenticatedContext(leaderUid).firestore();
    const memberDb = environment.authenticatedContext('member').firestore();
    await assertSucceeds(setDoc(doc(leaderDb, 'families/sunlau/presets/p1'), { title: '早餐', type: 'food' }));
    await assertFails(setDoc(doc(memberDb, 'families/sunlau/presets/p2'), { title: '早餐', type: 'food' }));
  });

  it('allows only the signed-in user to read and write their nested documents', async () => {
    const ownDb = environment.authenticatedContext('user-a').firestore();
    const otherDb = environment.authenticatedContext('user-b').firestore();
    const publicDb = environment.unauthenticatedContext().firestore();
    const ownEvent = doc(ownDb, 'users/user-a/events/event-1');

    await assertSucceeds(setDoc(ownEvent, { label: '私人行程' }));
    await assertSucceeds(getDoc(ownEvent));
    await assertFails(getDoc(doc(otherDb, 'users/user-a/events/event-1')));
    await assertFails(getDoc(doc(publicDb, 'users/user-a/events/event-1')));
  });
});

// 舊站（sssunwl.github.io/SunFamilyTrip）仍在線上，家人還在用它記帳／留言／
// 勾必買。這組測試確保新規則部署後不會把舊站打死，同時真的有收緊。
describe('舊站相容區 trips/**', () => {
  const validExpense = {
    item: '札嘎其海鮮', cost: 45000, inputCurrency: 'KRW', baseAmount: 45000,
    payer: 'ricky', splitters: ['ricky', 'pat'], type: 'public',
    category: '食', createdAt: 1757300000000,
  };

  beforeAll(async () => {
    await environment.withSecurityRulesDisabled(async (ctx) => {
      const raw = ctx.firestore();
      await setDoc(doc(raw, 'trips/busan2026/expenses/seeded'), validExpense);
      await setDoc(doc(raw, 'trips/busan2026/notes/seeded'), {
        userId: 'yi', name: 'Yi', avatar: '🐼', text: '好開心', createdAt: 1757300000000,
      });
    });
  });

  it('舊站需要的讀取仍然通', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'trips/busan2026/tools/shopping')));
    await assertSucceeds(getDoc(doc(db, 'trips/busan2026/expenses/seeded')));
  });

  it('記帳可新增、可刪除，但不可竄改既有紀錄', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'trips/busan2026/expenses/new1'), validExpense));
    await assertSucceeds(deleteDoc(doc(db, 'trips/busan2026/expenses/new1')));
    await assertFails(updateDoc(doc(db, 'trips/busan2026/expenses/seeded'), { cost: 1 }));
  });

  it('記帳夾帶白名單外的欄位會被擋', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'trips/busan2026/expenses/bad'), {
      ...validExpense, evil: 'x',
    }));
  });

  it('回憶留言只可新增，不可改不可刪', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'trips/busan2026/notes/n1'), {
      userId: 'pat', name: 'Pat', avatar: '🦊', text: '記低咗', createdAt: 1757300000000,
    }));
    await assertFails(deleteDoc(doc(db, 'trips/busan2026/notes/seeded')));
    await assertFails(updateDoc(doc(db, 'trips/busan2026/notes/seeded'), { text: '改咗' }));
  });

  it('必買勾選與投票可寫，行程本體不可寫', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'trips/busan2026/tools/shopping'),
      { checked: { ph01: '🦊' } }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, 'trips/busan2026/polls/first_pick'),
      { votes: { pat: '海雲台海邊' } }, { merge: true }));
    await assertFails(setDoc(doc(db, 'trips/busan2026'), { title: 'x' }));
  });

  it('白名單以外的路徑一律關閉', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'whatever/x')));
    await assertFails(setDoc(doc(db, 'whatever/x'), { a: 1 }));
  });
});
