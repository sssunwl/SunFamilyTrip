import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import busan from '../../migration/out/busan2026.json';
import pattaya from '../../migration/out/pattaya2026.json';
import type { Family, TripMember } from '../types/trip';
import type { TripDocument, TripSummary } from '../types/legacy';
import { db } from './firebase';

const localTrips: Record<string, TripDocument> = {
  busan2026: busan as TripDocument,
  pattaya2026: pattaya as TripDocument,
};

const familyMembers = Array.from(
  new Map(
    Object.values(localTrips)
      .flatMap((trip) => trip.members)
      .map((member) => [member.id, member]),
  ).values(),
) as TripMember[];

const localFamilies: Record<string, Family> = {
  sunlau: {
    id: 'sunlau',
    name: 'Sun & Lau Family',
    shortName: 'SLFT',
    theme: { accent: '#0B6E63', bg: '#E8ECEB' },
    leaders: [],
    members: familyMembers,
    holidayCountries: ['HK', 'TW'],
  },
  mok: {
    id: 'mok',
    name: 'Mok Family',
    shortName: 'MokFT',
    theme: { accent: '#4C6E9B', bg: '#E8ECEB' },
    leaders: [],
    members: [],
    holidayCountries: ['HK'],
  },
};

export async function getFamily(familyId: string): Promise<Family | null> {
  try {
    const snapshot = await getDoc(doc(db, 'families', familyId));
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Family;
    }
  } catch {
    // The checked-in migration output keeps P1 reviewable before Admin import.
  }
  return localFamilies[familyId] ?? null;
}

export async function getFamilyTrips(familyId: string): Promise<TripSummary[]> {
  try {
    const snapshot = await getDocs(collection(db, 'families', familyId, 'trips'));
    if (!snapshot.empty) {
      return snapshot.docs.map((tripDoc) => ({
        id: tripDoc.id,
        meta: (tripDoc.data() as TripDocument).meta,
      }));
    }
  } catch {
    // Fall through to deterministic local migration data.
  }

  if (familyId !== 'sunlau') return [];
  return Object.entries(localTrips).map(([id, trip]) => ({ id, meta: trip.meta }));
}

export async function getTrip(
  familyId: string,
  tripId: string,
): Promise<TripDocument | null> {
  try {
    const snapshot = await getDoc(doc(db, 'families', familyId, 'trips', tripId));
    if (snapshot.exists()) return snapshot.data() as TripDocument;
  } catch {
    // Fall through to deterministic local migration data.
  }

  if (familyId !== 'sunlau') return null;
  return localTrips[tripId] ?? null;
}
