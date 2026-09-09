import { describe, expect, it } from 'vitest';
import { formatTripText, type CopyTextOptions } from '../src/lib/copyText';

const trip = {
  days: [
    { id: 'd1', date: '2026-08-05', weekday: '三', theme: '抵達釜山 ✈️' },
    { id: 'd2', date: '2026-08-06', weekday: '四', theme: '海雲台' },
  ],
  members: [
    { id: 'justin', name: 'Justin', avatar: '🐻' },
    { id: 'han', name: 'Han', avatar: '🐼' },
  ],
  blocks: [
    { id: 'a', type: 'split' as const, dayId: 'd1', order: 0, time: '09:30', durationMin: 0, title: '分隊', groups: [
      { label: '醫美組', desc: '皮膚科報到', memberIds: ['justin'] },
      { label: '自由組', desc: '咖啡街 brunch', memberIds: ['han'] },
    ] },
    { id: 'b', type: 'sight' as const, dayId: 'd1', order: 1, time: '12:00', durationMin: 90, title: '海邊散步 📷', desc: '沿海慢慢走。', place: { name: '海雲台', localName: '해운대', mapUrl: 'https://maps.example/a' }, warn: '記得防曬' },
    { id: 'c', type: 'food' as const, dayId: 'd2', order: 0, time: '10:00', durationMin: 90, title: '早餐' },
  ],
};

const full: CopyTextOptions = { full: true, includeMaps: true, includeEmoji: true, wholeTrip: false };

describe('每日文字版', () => {
  it('展開分隊成員並輸出完整版、地圖與 emoji', () => {
    const text = formatTripText(trip, 'd1', full);
    expect(text).toContain('📅 8/5（三）Day 1');
    expect(text).toContain('09:30  分隊：醫美組 ／ 自由組');
    expect(text).toContain('‧ 醫美組（1）：皮膚科報到（Justin）');
    expect(text).toContain('沿海慢慢走。');
    expect(text).toContain('🔗 https://maps.example/a');
  });

  it('四個選項都改變輸出', () => {
    expect(formatTripText(trip, 'd1', { ...full, full: false })).not.toContain('沿海慢慢走。');
    expect(formatTripText(trip, 'd1', { ...full, includeMaps: false })).not.toContain('https://maps.example/a');
    expect(formatTripText(trip, 'd1', { ...full, includeEmoji: false })).not.toMatch(/[📅📷✈️]/u);
    expect(formatTripText(trip, 'd1', { ...full, wholeTrip: true })).toContain('Day 2 · 海雲台');
  });
});
