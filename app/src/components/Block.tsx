import {
  BedDouble,
  Binoculars,
  BusFront,
  CirclePause,
  Clock3,
  ListTodo,
  MapPin,
  ShoppingBag,
  StickyNote,
  TriangleAlert,
  UserRoundCheck,
  UsersRound,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Block as BlockData, BlockType } from '../types/trip';

const affiliateDisclosure = '透過此連結購買，我可能獲得少量回饋，價格不變';

const blockMeta: Record<BlockType, { label: string; icon: LucideIcon }> = {
  transport: { label: '交通', icon: BusFront },
  food: { label: '餐飲', icon: Utensils },
  sight: { label: '景點', icon: Binoculars },
  shopping: { label: '購物', icon: ShoppingBag },
  hotel: { label: '住宿', icon: BedDouble },
  rest: { label: '休息', icon: CirclePause },
  free: { label: '自由時間', icon: Clock3 },
  meetup: { label: '集合', icon: UserRoundCheck },
  split: { label: '分隊', icon: UsersRound },
  todo: { label: '待辦', icon: ListTodo },
  note: { label: '備註', icon: StickyNote },
};

export function Block({ block }: { block: BlockData }) {
  const meta = blockMeta[block.type];
  const Icon = meta.icon;
  const style = { '--block-color': `var(--bt-${block.type})` } as CSSProperties;

  return (
    <article className="block-card" style={style}>
      <time className="block-time" dateTime={block.time}>{block.time}</time>
      <div>
        <span className="block-type"><Icon aria-hidden />{meta.label}</span>
        <h3>{block.title}</h3>
        {block.desc && <p className="block-description">{block.desc}</p>}
        {block.place && (
          <a
            className="block-place"
            href={block.place.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin aria-hidden />
            <span>
              {block.place.name}
              {block.place.localName && <span className="local-name">{block.place.localName}</span>}
            </span>
          </a>
        )}
        {block.warn && (
          <p className="block-warning"><TriangleAlert aria-hidden />{block.warn}</p>
        )}
        {block.groups && block.groups.length > 0 && (
          <ul className="split-groups">
            {block.groups.map((group) => (
              <li key={group.label}><strong>{group.label}</strong>：{group.desc}</li>
            ))}
          </ul>
        )}
        {block.affiliate?.url && <div className="affiliate-box"><a className="text-link" href={block.affiliate.url} target="_blank" rel="nofollow sponsored noreferrer">到 {block.affiliate.platform} 查看</a><p className="affiliate-disclosure">{affiliateDisclosure}</p></div>}
      </div>
    </article>
  );
}
