import type { GuideItem } from '../types/trip';

export const guideCsvColumns = [
  'category', 'name', 'localName', 'tag', 'note', 'desc', 'imageUrl', 'showText',
  'buyable', 'priceAmount', 'priceCurrency', 'affiliateUrl', 'affiliatePlatform',
] as const;

const affiliatePlatforms = ['Amazon JP', '樂天', 'Qoo10', 'Shopee'];
const disclosure = '透過此連結購買，我可能獲得少量回饋，價格不變';

export interface CsvPreviewRow {
  row: number;
  action: 'new' | 'update' | 'error';
  name: string;
  item?: GuideItem;
  error?: string;
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (character !== '\r') field += character;
  }
  if (quoted) throw new Error('CSV 有未關閉的雙引號');
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim()));
}

function booleanValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', '是'].includes(normalized)) return true;
  if (['false', '0', '否'].includes(normalized)) return false;
  if (!normalized) return undefined;
  throw new Error(`buyable「${value}」不是 true/false/1/0/是/否`);
}

export function previewGuideCsv(text: string, existing: GuideItem[]): CsvPreviewRow[] {
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (error) {
    return [{ row: 1, action: 'error', name: '', error: (error as Error).message }];
  }
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  if (!headers.includes('name')) return [{ row: 1, action: 'error', name: '', error: '標題列缺少 name 欄位' }];
  const unknown = headers.filter((header) => header && !guideCsvColumns.includes(header as typeof guideCsvColumns[number]));
  if (unknown.length) return [{ row: 1, action: 'error', name: '', error: `不支援的欄位：${unknown.join('、')}` }];

  return rows.slice(1).map((values, index) => {
    const rowNumber = index + 2;
    const record = Object.fromEntries(headers.map((header, column) => [header, (values[column] ?? '').trim()]));
    const name = record.name ?? '';
    try {
      if (!name) throw new Error('name 不可留空');
      const current = existing.find((item) => item.name === name);
      const buyable = booleanValue(record.buyable ?? '');
      const amountText = record.priceAmount ?? '';
      const amount = amountText ? Number(amountText) : undefined;
      if (amountText && !Number.isFinite(amount)) throw new Error(`priceAmount「${amountText}」不是數字`);
      const affiliateUrl = record.affiliateUrl ?? '';
      const platform = record.affiliatePlatform ?? '';
      if (affiliateUrl && !platform) throw new Error('有 affiliateUrl 時必須填 affiliatePlatform');
      if (platform && !affiliatePlatforms.includes(platform)) throw new Error(`不支援的 affiliatePlatform「${platform}」`);

      const item: GuideItem = {
        id: current?.id ?? crypto.randomUUID(),
        category: record.category || current?.category || '',
        name,
        localName: record.localName || current?.localName,
        tag: record.tag || current?.tag,
        note: record.note || current?.note,
        desc: record.desc || current?.desc,
        images: record.imageUrl ? [record.imageUrl] : current?.images ?? [],
        showText: record.showText || current?.showText,
        buyable: buyable ?? current?.buyable ?? false,
        price: amount !== undefined ? { amount, currency: record.priceCurrency || current?.price?.currency || '' } : current?.price ?? null,
        affiliate: affiliateUrl ? { url: affiliateUrl, platform, disclosure } : current?.affiliate ?? null,
        source: 'csv',
      };
      return { row: rowNumber, action: current ? 'update' : 'new', name, item };
    } catch (error) {
      return { row: rowNumber, action: 'error', name, error: (error as Error).message };
    }
  });
}
