import { useState } from 'react';
import type { Block as BlockData, Day } from '../types/trip';
import { Block } from './Block';

interface DayListProps {
  days: Day[];
  blocks: BlockData[];
  initialDayId?: string;
}

export function DayList({ days, blocks, initialDayId }: DayListProps) {
  const [activeDayId, setActiveDayId] = useState(initialDayId ?? days[0]?.id ?? '');
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];

  if (!activeDay) return <p className="empty-row">這趟行程尚未安排日程。</p>;
  const activeBlocks = blocks
    .filter((block) => block.dayId === activeDay.id)
    .sort((a, b) => a.order - b.order);

  return (
    <section className="day-section" aria-labelledby="day-heading">
      <div className="day-tabs" role="tablist" aria-label="選擇行程日期">
        {days.map((day, index) => (
          <button
            className="day-tab"
            id={`tab-${day.id}`}
            key={day.id}
            role="tab"
            aria-controls={`panel-${day.id}`}
            aria-selected={day.id === activeDay.id}
            type="button"
            onClick={() => setActiveDayId(day.id)}
          >
            Day {index + 1} · {day.date.slice(5).replace('-', '/')}
          </button>
        ))}
      </div>

      <div id={`panel-${activeDay.id}`} role="tabpanel" aria-labelledby={`tab-${activeDay.id}`}>
        <header className="day-heading" id={activeDay.id}>
          <div className="day-date">{activeDay.date}<br />星期{activeDay.weekday}</div>
          <div>
            <h2 id="day-heading">{activeDay.theme}</h2>
            {activeDay.highlights && <p className="day-highlight">{activeDay.highlights}</p>}
          </div>
        </header>
        <div className="block-list">
          {activeBlocks.map((block) => <Block block={block} key={block.id} />)}
        </div>
      </div>
    </section>
  );
}
