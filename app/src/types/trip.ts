export type BlockType =
  | 'transport' | 'food' | 'sight' | 'shopping' | 'hotel'
  | 'rest' | 'free' | 'meetup' | 'split' | 'todo' | 'note';

export interface Place {
  name: string;
  localName?: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface SplitGroup {
  label: string;
  desc: string;
  memberIds: string[];
}

export interface Block {
  id: string;
  type: BlockType;
  dayId: string;
  order: number;
  time: string;
  durationMin: number;
  title: string;
  desc?: string;
  place?: Place;
  assignees?: string[];
  warn?: string;
  images?: string[];
  groups?: SplitGroup[];
  affiliate?: { url: string; platform: string } | null;
  from?: string;
  to?: string;
  mode?: '步行' | '地鐵' | '的士' | '巴士' | '火車' | '航班' | '船';
  fare?: string;
  mealType?: '早' | '午' | '晚' | '宵夜' | '咖啡';
  budget?: string;
  needReserve?: boolean;
  ticketPrice?: string;
  needBooking?: boolean;
  openHours?: string;
  taxRefund?: boolean;
  checkIn?: string;
  checkOut?: string;
  address?: string;
  localAddress?: string;
  directions?: string;
  meetingPoint?: string;
  contact?: string;
  reminderDate?: string;
  responsibleMemberIds?: string[];
}

export interface Day {
  id: string;
  date: string;
  weekday: string;
  theme: string;
  highlights?: string;
}

export interface TripMember {
  id: string; name: string; avatar: string;
  role?: string;
  defaultRole?: string;
  excludeFromSplit?: boolean;
}

export interface GuideItem {
  id: string;
  category: string;
  name: string;
  localName?: string;
  tag?: string;
  note?: string;
  desc?: string;
  images: string[];
  showText?: string;
  buyable: boolean;
  price?: { amount: number; currency: string } | null;
  affiliate?: { url: string; platform: string; disclosure: string } | null;
  source: 'manual' | 'csv' | 'guide' | 'legacy';
}

export interface Trip {
  meta: {
    title: string; subtitle: string;
    city: string; country: string;
    coords?: { lat: number; lng: number };
    currency: string;
    startDate: string; endDate: string;
    heroImg?: string; photosUrl?: string;
    emergency: { label: string; phone: string }[];
    status: 'draft' | 'upcoming' | 'live' | 'past';
  };
  members: TripMember[];
  days: Day[];
  blocks: Block[];
  guide: GuideItem[];
  version: number;
  updatedAt: number;
  updatedBy: string;
}

export interface AvailabilityEntry {
  id: string;
  memberIds: string[];
  from: string;
  to: string;
  kind: 'trip' | 'busy' | 'free';
  label: string;
  note?: string;
  createdBy: string;
  createdAt: number;
}

export interface Family {
  id: string; name: string; shortName: string;
  theme: { accent: string; bg: string };
  leaders: string[];
  members: TripMember[];
  holidayCountries: string[];
}
