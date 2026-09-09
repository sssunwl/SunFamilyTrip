import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import type { Block, Family, TripMember } from '../types/trip';
import type { TripDocument, TripSummary } from '../types/legacy';
import { db } from './firebase';

export type DataSource = 'firestore' | 'local';

export interface Loaded<T> {
  data: T;
  source: DataSource;
}

export class VersionConflictError extends Error {
  constructor() {
    super('VERSION_CONFLICT');
    this.name = 'VersionConflictError';
  }
}

async function localData() {
  if (!import.meta.env.DEV) return null;
  const [{ default: busan }, { default: pattaya }] = await Promise.all([
    import('../../migration/out/busan2026.json'),
    import('../../migration/out/pattaya2026.json'),
  ]);
  const trips: Record<string, TripDocument> = {
    busan2026: busan as TripDocument,
    pattaya2026: pattaya as TripDocument,
  };
  const members = Array.from(
    new Map(
      Object.values(trips)
        .flatMap((trip) => trip.members)
        .map((member) => [member.id, member]),
    ).values(),
  ) as TripMember[];
  const families: Record<string, Family> = {
    sunlau: {
      id: 'sunlau', name: 'Sun & Lau Family', shortName: 'SLFT',
      theme: { accent: '#0B6E63', bg: '#E8ECEB' },
      leaders: [], members, holidayCountries: ['HK', 'TW'],
    },
    mok: {
      id: 'mok', name: 'Mok Family', shortName: 'MokFT',
      theme: { accent: '#4C6E9B', bg: '#E8ECEB' },
      leaders: [], members: [], holidayCountries: ['HK'],
    },
  };
  return { trips, families };
}

export function friendlyDataError(error: unknown) {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) return '沒有權限讀取資料，請重新登入。';
  if (code.includes('unavailable') || code.includes('network')) return '連不上資料庫，請檢查網路。';
  return '暫時無法載入資料，請稍後重試。';
}

export async function getFamily(familyId: string): Promise<Loaded<Family | null>> {
  try {
    const snapshot = await getDoc(doc(db, 'families', familyId));
    return {
      data: snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Family : null,
      source: 'firestore',
    };
  } catch (error) {
    const local = await localData();
    if (!local) throw error;
    return { data: local.families[familyId] ?? null, source: 'local' };
  }
}

export async function getFamilyTrips(familyId: string): Promise<Loaded<TripSummary[]>> {
  try {
    const snapshot = await getDocs(collection(db, 'families', familyId, 'trips'));
    return {
      data: snapshot.docs.map((tripDoc) => ({
        id: tripDoc.id,
        meta: (tripDoc.data() as TripDocument).meta,
      })),
      source: 'firestore',
    };
  } catch (error) {
    const local = await localData();
    if (!local) throw error;
    const trips = familyId === 'sunlau'
      ? Object.entries(local.trips).map(([id, trip]) => ({ id, meta: trip.meta }))
      : [];
    return { data: trips, source: 'local' };
  }
}

export async function getTrip(
  familyId: string,
  tripId: string,
): Promise<Loaded<TripDocument | null>> {
  try {
    const snapshot = await getDoc(doc(db, 'families', familyId, 'trips', tripId));
    return { data: snapshot.exists() ? snapshot.data() as TripDocument : null, source: 'firestore' };
  } catch (error) {
    const local = await localData();
    if (!local) throw error;
    return {
      data: familyId === 'sunlau' ? local.trips[tripId] ?? null : null,
      source: 'local',
    };
  }
}

export async function saveTrip(
  familyId: string,
  tripId: string,
  trip: TripDocument,
  expectedVersion: number,
  uid: string,
) {
  const reference = doc(db, 'families', familyId, 'trips', tripId);
  const nextVersion = expectedVersion + 1;
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(reference);
    if (!current.exists() || current.data().version !== expectedVersion) {
      throw new VersionConflictError();
    }
    transaction.set(reference, {
      ...trip,
      version: nextVersion,
      updatedAt: Date.now(),
      updatedBy: uid,
    });
  });
  return nextVersion;
}

export async function saveFamilyPreset(
  familyId: string,
  block: Block,
  uid: string,
) {
  const presetId = crypto.randomUUID();
  await setDoc(doc(db, 'families', familyId, 'presets', presetId), {
    ...block,
    id: presetId,
    dayId: '',
    order: 0,
    createdAt: Date.now(),
    createdBy: uid,
  });
}
