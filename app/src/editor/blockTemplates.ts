import type { Block, BlockType } from '../types/trip';

export const blockTemplates: Array<{
  type: BlockType;
  label: string;
  icon: string;
  durationMin: number;
  preview: string;
}> = [
  { type: 'transport', label: '交通', icon: '🚌', durationMin: 30, preview: '起點、終點、方式、車資' },
  { type: 'food', label: '餐飲', icon: '🍜', durationMin: 90, preview: '餐別、預算、訂位' },
  { type: 'sight', label: '景點', icon: '📷', durationMin: 120, preview: '票價、預約、營業時間' },
  { type: 'shopping', label: '購物', icon: '🛍️', durationMin: 90, preview: '預算、退稅' },
  { type: 'hotel', label: '住宿', icon: '🏨', durationMin: 0, preview: '入住、退房、地址、交通' },
  { type: 'rest', label: '休息', icon: '☕', durationMin: 60, preview: '休息時段' },
  { type: 'free', label: '自由時間', icon: '🌿', durationMin: 120, preview: '自由活動安排' },
  { type: 'meetup', label: '集合', icon: '📍', durationMin: 15, preview: '集合點、聯絡人' },
  { type: 'split', label: '分隊', icon: '👥', durationMin: 0, preview: '多組安排與成員' },
  { type: 'todo', label: '待辦提醒', icon: '✅', durationMin: 0, preview: '提醒日期、負責人' },
  { type: 'note', label: '備註', icon: '📝', durationMin: 0, preview: '純文字' },
];

export function createBlock(type: BlockType, dayId: string, order: number): Block {
  const template = blockTemplates.find((item) => item.type === type)!;
  const base: Block = {
    id: crypto.randomUUID(), type, dayId, order, time: '',
    durationMin: template.durationMin, title: template.label, desc: '',
    assignees: [], warn: '', images: [], affiliate: null,
  };
  if (type === 'transport') Object.assign(base, { from: '', to: '', mode: '步行', fare: '' });
  if (type === 'food') Object.assign(base, { mealType: '午', budget: '', needReserve: false });
  if (type === 'sight') Object.assign(base, { ticketPrice: '', needBooking: false, openHours: '' });
  if (type === 'shopping') Object.assign(base, { budget: '', taxRefund: false });
  if (type === 'hotel') Object.assign(base, { checkIn: '', checkOut: '', address: '', localAddress: '', directions: '' });
  if (type === 'meetup') Object.assign(base, { meetingPoint: '', contact: '' });
  if (type === 'split') base.groups = [
    { label: 'A 組', desc: '', memberIds: [] },
    { label: 'B 組', desc: '', memberIds: [] },
  ];
  if (type === 'todo') Object.assign(base, { reminderDate: '', responsibleMemberIds: [] });
  return base;
}

export function normalizeOrders(blocks: Block[]) {
  const byDay = new Map<string, Block[]>();
  blocks.forEach((block) => byDay.set(block.dayId, [...(byDay.get(block.dayId) ?? []), block]));
  return Array.from(byDay.values()).flatMap((items) => items
    .sort((a, b) => a.order - b.order)
    .map((block, order) => ({ ...block, order })));
}
