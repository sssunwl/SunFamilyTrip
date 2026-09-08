import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import type { Block, BlockType, Day, GuideItem, TripMember } from '../src/types/trip';
import type { LegacyRecord, TripDocument } from '../src/types/legacy';

type HtmlNode = {
  nodeName?: string;
  childNodes?: HtmlNode[];
  value?: string;
};

type LegacyDay = {
  id: string;
  date: string;
  weekday: string;
  theme: string;
  highlights?: string;
  details: LegacyDetail[];
};

type LegacyDetail = {
  id: string | number;
  type: string;
  time: string;
  title: string;
  desc?: string;
  location?: string;
  show_text?: string;
  thai_text?: string;
  img?: string;
};

type LegacyGuideItem = LegacyRecord & {
  id: string | number;
  category?: string;
  name?: string;
  localName?: string;
  tag?: string;
  note?: string;
  desc?: string;
  desc_1?: string;
  desc_2?: string;
  show_text?: string;
  buyable?: boolean;
  image?: unknown;
  cover?: unknown;
  gallery1?: unknown;
  gallery2?: unknown;
};

type LegacySource = {
  TRIP_ID: string;
  TRIP_TITLE: string;
  TRIP_SUBTITLE: string;
  TRIP_HERO_IMG?: string;
  PHOTOS_URL?: string;
  TRIP_CITY: string;
  TRIP_COORDS?: { lat: number; lon: number };
  TRIP_DEFAULT_CURRENCY: string;
  TRIP_START_DATE?: string;
  TRIP_END_DATE?: string;
  TRIP_EMERGENCY?: { label: string; phone: string }[];
  TRIP_FLIGHTS?: LegacyRecord[];
  TRIP_ACCOMMODATION?: LegacyRecord;
  MEMBERS: TripMember[];
  ITINERARY: LegacyDay[];
  GUIDE_ITEMS?: LegacyGuideItem[];
};

const migrationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(migrationDir, '../..');
const outputDir = path.join(migrationDir, 'out');
const inputs = [
  path.join(repoRoot, 'trips/busan2026.html'),
  path.join(repoRoot, 'trips/pattaya2026.html'),
];

const exportNames = [
  'TRIP_ID',
  'TRIP_TITLE',
  'TRIP_SUBTITLE',
  'TRIP_HERO_IMG',
  'PHOTOS_URL',
  'TRIP_CITY',
  'TRIP_COORDS',
  'TRIP_DEFAULT_CURRENCY',
  'TRIP_START_DATE',
  'TRIP_END_DATE',
  'TRIP_EMERGENCY',
  'TRIP_FLIGHTS',
  'TRIP_ACCOMMODATION',
  'MEMBERS',
  'ITINERARY',
  'GUIDE_ITEMS',
] as const;

function findDataScript(node: HtmlNode): string | null {
  if (node.nodeName === 'script') {
    const source = node.childNodes?.map((child) => child.value ?? '').join('') ?? '';
    if (source.includes('const TRIP_ID')) return source;
  }

  for (const child of node.childNodes ?? []) {
    const found = findDataScript(child);
    if (found) return found;
  }
  return null;
}

function evaluateDataScript(source: string, filename: string): LegacySource {
  const capture = exportNames
    .map((name) => `${name}: typeof ${name} === 'undefined' ? undefined : ${name}`)
    .join(',');
  const context: vm.Context = {};
  vm.runInNewContext(
    `${source}\n;globalThis.__SONGSONG_DATA__ = {${capture}};`,
    context,
    { filename },
  );
  return context.__SONGSONG_DATA__ as LegacySource;
}

function yearFrom(source: LegacySource): number {
  const explicit = source.TRIP_START_DATE?.slice(0, 4);
  if (explicit && /^\d{4}$/.test(explicit)) return Number(explicit);
  const subtitleYear = source.TRIP_SUBTITLE.match(/\b20\d{2}\b/)?.[0];
  if (subtitleYear) return Number(subtitleYear);
  throw new Error(`${source.TRIP_ID}: 無法判斷年份`);
}

function toIsoDate(value: string, year: number): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [month, day] = value.split('/').map(Number);
  if (!month || !day) throw new Error(`無法轉換日期：${value}`);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function minutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function durationFor(details: LegacyDetail[], index: number): number {
  if (index === details.length - 1) return 90;
  const current = minutes(details[index].time);
  const next = minutes(details[index + 1].time);
  if (current === null || next === null || next <= current) return 60;
  return next - current;
}

function extractWarning(description?: string): { desc?: string; warn?: string } {
  if (!description) return {};
  const sentences = description.match(/[^。！？!?]+[。！？!?]?/gu) ?? [description];
  const warnings: string[] = [];
  const normal: string[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.startsWith('⚠️')) warnings.push(trimmed.replace(/^⚠️\s*/u, ''));
    else if (trimmed) normal.push(trimmed);
  }

  return {
    ...(normal.length ? { desc: normal.join('') } : {}),
    ...(warnings.length ? { warn: warnings.join(' ') } : {}),
  };
}

function blockType(type: string, tripId: string, detailId: string | number): BlockType {
  if (type === 'activity') return 'sight';
  if (type === 'spa') return 'rest';
  if (['transport', 'food', 'hotel', 'shopping'].includes(type)) return type as BlockType;
  console.warn(`${tripId}/${detailId}: 未知 block type "${type}"，改為 note`);
  return 'note';
}

function assetUrl(value: string): string {
  return value.startsWith('../assets/') ? value.slice(2) : value;
}

function imageUrls(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [assetUrl(value)];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === 'string') return [assetUrl(item)];
      if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        return [assetUrl(item.url)];
      }
      return [];
    });
  }
  return [];
}

function transformGuide(item: LegacyGuideItem): GuideItem {
  const descriptions = [item.desc, item.desc_1, item.desc_2].filter(Boolean) as string[];
  const images = Array.from(new Set([
    ...imageUrls(item.image),
    ...imageUrls(item.cover),
    ...imageUrls(item.gallery1),
    ...imageUrls(item.gallery2),
  ]));

  return {
    id: String(item.id),
    category: item.category ?? '',
    name: item.name ?? '',
    ...(item.localName ? { localName: item.localName } : {}),
    ...(item.tag ? { tag: item.tag } : {}),
    ...(item.note ? { note: item.note } : {}),
    ...(descriptions.length ? { desc: descriptions.join('\n\n') } : {}),
    images,
    ...(item.show_text ? { showText: item.show_text } : {}),
    buyable: item.buyable === true,
    source: 'legacy',
  };
}

function transform(source: LegacySource): TripDocument {
  const year = yearFrom(source);
  const days: Day[] = source.ITINERARY.map((day) => ({
    id: day.id,
    date: toIsoDate(day.date, year),
    weekday: day.weekday.replace(/[()（）]/g, ''),
    theme: day.theme,
    ...(day.highlights ? { highlights: day.highlights } : {}),
  }));

  const blocks: Block[] = source.ITINERARY.flatMap((day) =>
    day.details.map((detail, order) => {
      const text = extractWarning(detail.desc);
      const localName = detail.show_text ?? detail.thai_text;
      return {
        id: String(detail.id),
        type: blockType(detail.type, source.TRIP_ID, detail.id),
        dayId: day.id,
        order,
        time: detail.time,
        durationMin: durationFor(day.details, order),
        title: detail.title,
        ...text,
        ...(detail.location
          ? {
              place: {
                name: detail.location,
                ...(localName ? { localName } : {}),
                mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.location)}`,
              },
            }
          : {}),
        ...(detail.img ? { images: [assetUrl(detail.img)] } : {}),
      };
    }),
  );

  const startDate = source.TRIP_START_DATE ?? days.at(0)?.date;
  const endDate = source.TRIP_END_DATE ?? days.at(-1)?.date;
  if (!startDate || !endDate) throw new Error(`${source.TRIP_ID}: 缺少行程日期`);

  const countryByTrip: Record<string, string> = {
    busan2026: '韓國',
    pattaya2026: '泰國',
  };

  return {
    meta: {
      title: source.TRIP_TITLE,
      subtitle: source.TRIP_SUBTITLE,
      city: source.TRIP_CITY,
      country: countryByTrip[source.TRIP_ID] ?? '',
      ...(source.TRIP_COORDS
        ? { coords: { lat: source.TRIP_COORDS.lat, lng: source.TRIP_COORDS.lon } }
        : {}),
      currency: source.TRIP_DEFAULT_CURRENCY,
      startDate,
      endDate,
      ...(source.TRIP_HERO_IMG ? { heroImg: source.TRIP_HERO_IMG } : {}),
      ...(source.PHOTOS_URL ? { photosUrl: source.PHOTOS_URL } : {}),
      emergency: source.TRIP_EMERGENCY ?? [],
      status: 'past',
      ...(source.TRIP_FLIGHTS ? { flights: source.TRIP_FLIGHTS } : {}),
      ...(source.TRIP_ACCOMMODATION ? { accommodation: source.TRIP_ACCOMMODATION } : {}),
    },
    members: source.MEMBERS,
    days,
    blocks,
    guide: (source.GUIDE_ITEMS ?? []).map(transformGuide),
    version: 1,
    updatedAt: 0,
    updatedBy: 'migration',
  };
}

async function extractFile(filename: string) {
  const html = await readFile(filename, 'utf8');
  const document = parse(html) as HtmlNode;
  const dataScript = findDataScript(document);
  if (!dataScript) throw new Error(`${filename}: 找不到含 TRIP_ID 的資料 script`);
  const source = evaluateDataScript(dataScript, filename);
  const output = transform(source);
  const destination = path.join(outputDir, `${source.TRIP_ID}.json`);
  await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`${source.TRIP_ID}: ${output.days.length} 日、${output.blocks.length} 個行程、${output.guide.length} 個指南項目`);
}

await mkdir(outputDir, { recursive: true });
for (const input of inputs) await extractFile(input);
