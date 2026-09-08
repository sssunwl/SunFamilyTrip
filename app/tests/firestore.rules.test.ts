import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  environment = await initializeTestEnvironment({
    projectId: 'sunfamily-trips',
    firestore: { host: '127.0.0.1', port: 8080, rules },
  });
});

afterAll(async () => {
  await environment.cleanup();
});

describe('P1 Firestore rules', () => {
  it('allows public reads from families and trip subcollections', async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau')));
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau/trips/busan2026')));
    await assertSucceeds(getDoc(doc(firestore, 'families/sunlau/trips/busan2026/notes/a')));
  });

  it('rejects all family and trip writes, including authenticated writes', async () => {
    const publicDb = environment.unauthenticatedContext().firestore();
    const leaderDb = environment.authenticatedContext('leader').firestore();
    await assertFails(setDoc(doc(publicDb, 'families/sunlau'), { name: 'changed' }));
    await assertFails(setDoc(doc(leaderDb, 'families/sunlau/trips/busan2026'), { version: 2 }));
    await assertFails(setDoc(doc(leaderDb, 'families/sunlau/trips/busan2026/notes/a'), { text: 'x' }));
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
