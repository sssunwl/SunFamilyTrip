import { describe, expect, it } from 'vitest';
import { previewGuideCsv } from '../src/lib/csv';
import type { GuideItem } from '../src/types/trip';

const existing: GuideItem[] = [{ id: 'old', category: '藥局', name: '活命水', images: [], buyable: true, source: 'legacy' }];

describe('指南 CSV 預覽', () => {
  it('逐列分辨新增、更新與錯誤，並接受所有布林格式', () => {
    const csv = `category,name,note,buyable,priceAmount,priceCurrency\n藥局,活命水,新版,是,1200,KRW\n零食,"海苔, 原味",,1,,\n零食,杏仁,好吃,false,,\n零食,糖果,,0,,\n零食,餅乾,,否,,\n零食,錯誤,,maybe,,`;
    const rows = previewGuideCsv(csv, existing);
    expect(rows.map((row) => row.action)).toEqual(['update', 'new', 'new', 'new', 'new', 'error']);
    expect(rows[1].name).toBe('海苔, 原味');
    expect(rows[0].item?.id).toBe('old');
    expect(rows[5].error).toContain('buyable');
  });

  it('標題列必須有 name', () => {
    expect(previewGuideCsv('category,note\n零食,好吃', existing)[0].error).toContain('name');
  });
});
