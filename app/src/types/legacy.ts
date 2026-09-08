import type { Trip } from './trip';

export type LegacyRecord = Record<string, unknown>;

export type TripDocument = Omit<Trip, 'meta'> & {
  meta: Trip['meta'] & {
    flights?: LegacyRecord[];
    accommodation?: LegacyRecord;
  };
};

export interface TripSummary {
  id: string;
  meta: TripDocument['meta'];
}
