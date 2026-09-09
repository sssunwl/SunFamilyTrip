import type { Block, Day, TripMember } from '../types/trip';

export interface CopyTextOptions {
  full: boolean;
  includeMaps: boolean;
  includeEmoji: boolean;
  wholeTrip: boolean;
}

export const defaultCopyTextOptions: CopyTextOptions = {
  full: true,
  includeMaps: true,
  includeEmoji: true,
  wholeTrip: false,
};

export interface CopyTextTrip {
  days: Day[];
  blocks: Block[];
  members: TripMember[];
}

function indent(value: string) {
  return value.split(/\r?\n/).filter(Boolean).map((line) => `       ${line}`).join('\n');
}

export function stripEmoji(value: string) {
  return value
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\u200D/gu, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/ {2,}/g, ' ');
}

function splitLines(block: Block, members: TripMember[]) {
  const groups = block.groups ?? [];
  if (groups.length === 0) return [];
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  return groups.map((group) => {
    const names = group.memberIds.map((id) => memberNames.get(id) ?? id).filter(Boolean);
    const count = names.length ? `（${names.length}）` : '';
    const description = group.desc || '未填安排';
    const people = names.length ? `（${names.join('、')}）` : '';
    return `       ‧ ${group.label}${count}：${description}${people}`;
  });
}

function blockText(block: Block, members: TripMember[], options: CopyTextOptions) {
  const time = block.time || '--:--';
  const splitTitle = block.type === 'split' && block.groups?.length
    ? `分隊：${block.groups.map((group) => group.label).join(' ／ ')}`
    : block.title;
  const lines = [`${time}  ${splitTitle}`];

  if (block.type === 'split') lines.push(...splitLines(block, members));
  if (options.full && block.desc) lines.push(indent(block.desc));
  if (options.full && block.place?.localName) {
    lines.push(`       ${options.includeEmoji ? '📍 ' : ''}${block.place.localName}`);
  }
  if (options.includeMaps && block.place?.mapUrl) {
    lines.push(`       ${options.includeEmoji ? '🔗 ' : ''}${block.place.mapUrl}`);
  }
  if (options.full && block.warn) {
    lines.push(`${options.includeEmoji ? '⚠️ ' : ''}${block.warn}`);
  }
  return lines.join('\n');
}

function dayText(trip: CopyTextTrip, day: Day, options: CopyTextOptions) {
  const index = trip.days.findIndex((item) => item.id === day.id);
  const date = day.date ? `${Number(day.date.slice(5, 7))}/${Number(day.date.slice(8, 10))}` : '';
  const header = `${options.includeEmoji ? '📅 ' : ''}${date}（${day.weekday}）Day ${index + 1}${day.theme ? ` · ${day.theme}` : ''}`;
  const blocks = trip.blocks
    .filter((block) => block.dayId === day.id)
    .sort((a, b) => a.order - b.order)
    .map((block) => blockText(block, trip.members, options));
  return [header, ...blocks].join('\n\n');
}

export function formatTripText(trip: CopyTextTrip, dayId: string, options: CopyTextOptions) {
  const days = options.wholeTrip
    ? trip.days
    : trip.days.filter((day) => day.id === dayId);
  const text = days.map((day) => dayText(trip, day, options)).join('\n\n──────────\n\n');
  return options.includeEmoji ? text : stripEmoji(text);
}
