import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, MoreHorizontal } from 'lucide-react';
import type { CSSProperties } from 'react';
import { blockTemplates } from '../../editor/blockTemplates';
import type { Block, Day } from '../../types/trip';

function DayTab({ day, index, active, onClick }: { day: Day; index: number; active: boolean; onClick: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `day:${day.id}`, data: { kind: 'day', dayId: day.id } });
  return (
    <button
      className="editor-day-tab"
      data-over={isOver || undefined}
      aria-selected={active}
      ref={setNodeRef}
      role="tab"
      type="button"
      onClick={onClick}
    >Day {index + 1}<small>{day.date.slice(5).replace('-', '/')}</small></button>
  );
}

function SortableBlock({
  block, selected, dayIndex, days, disabled, onSelect, onMove, onDuplicate,
  onDelete, onSavePreset,
}: {
  block: Block; selected: boolean; dayIndex: number; days: Day[]; disabled: boolean;
  onSelect: () => void; onMove: (dayId: string, direction?: -1 | 1) => void;
  onDuplicate: (dayId: string) => void; onDelete: () => void; onSavePreset: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `block:${block.id}`,
    data: { kind: 'block', blockId: block.id, dayId: block.dayId },
    disabled,
  });
  const template = blockTemplates.find((item) => item.type === block.type)!;
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    '--block-color': `var(--bt-${block.type})`,
  } as CSSProperties;
  return (
    <article
      className="editor-block-card"
      data-selected={selected || undefined}
      data-dragging={isDragging || undefined}
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
    >
      <button className="drag-handle" disabled={disabled} type="button" aria-label={`拖曳 ${block.title}`} {...attributes} {...listeners}><GripVertical aria-hidden /></button>
      <div className="editor-block-main">
        <span className="block-type"><span aria-hidden>{template.icon}</span>{template.label}</span>
        <strong>{block.title || '未命名積木'}</strong>
        <span className="editor-block-meta mono">{block.time || '未定時間'}{block.durationMin ? ` · ${block.durationMin} 分` : ''}</span>
      </div>
      <div className="card-move-buttons">
        <button disabled={disabled || block.order === 0} type="button" aria-label="向上移" onClick={(event) => { event.stopPropagation(); onMove(block.dayId, -1); }}><ChevronUp aria-hidden /></button>
        <button disabled={disabled} type="button" aria-label="向下移" onClick={(event) => { event.stopPropagation(); onMove(block.dayId, 1); }}><ChevronDown aria-hidden /></button>
      </div>
      <details className="card-menu" onClick={(event) => event.stopPropagation()}>
        <summary aria-label="積木選單"><MoreHorizontal aria-hidden /></summary>
        <div className="menu-popover">
          <button disabled={disabled} type="button" onClick={() => onDuplicate(block.dayId)}>複製</button>
          <span className="menu-label">搬到 Day…</span>
          <div className="menu-day-buttons">{days.map((day, index) => index === dayIndex ? null : <button disabled={disabled} type="button" key={day.id} onClick={() => onMove(day.id)}>搬到 Day {index + 1}</button>)}</div>
          <span className="menu-label">複製到其他天</span>
          <div className="menu-day-buttons">{days.map((day, index) => index === dayIndex ? null : <button disabled={disabled} type="button" key={day.id} onClick={() => onDuplicate(day.id)}>複製到 Day {index + 1}</button>)}</div>
          <button disabled={disabled} type="button" onClick={onSavePreset}>另存為家庭範本</button>
          <button className="danger-text" disabled={disabled} type="button" onClick={onDelete}>刪除</button>
        </div>
      </details>
    </article>
  );
}

export function EditorCanvas({
  days, blocks, activeDayId, selectedBlockId, disabled, onActiveDay, onSelect,
  onMove, onDuplicate, onDelete, onSavePreset, onCopyDay, onImportDay,
  onAddDay, onDeleteDay,
}: {
  days: Day[]; blocks: Block[]; activeDayId: string; selectedBlockId: string | null; disabled: boolean;
  onActiveDay: (id: string) => void; onSelect: (id: string) => void;
  onMove: (id: string, dayId: string, direction?: -1 | 1) => void;
  onDuplicate: (id: string, dayId: string) => void; onDelete: (id: string) => void;
  onSavePreset: (id: string) => void; onCopyDay: (targetDayId: string) => void;
  onImportDay: () => void; onAddDay: () => void; onDeleteDay: () => void;
}) {
  const activeDay = days.find((day) => day.id === activeDayId) ?? days[0];
  const { isOver: isCanvasOver, setNodeRef: setCanvasRef } = useDroppable({
    id: `canvas:${activeDay?.id ?? 'empty'}`,
    data: { kind: 'canvas', dayId: activeDay?.id },
    disabled: !activeDay,
  });
  const activeIndex = days.findIndex((day) => day.id === activeDay?.id);
  const activeBlocks = blocks.filter((block) => block.dayId === activeDay?.id).sort((a, b) => a.order - b.order);
  if (!activeDay) return <section className="editor-canvas"><button className="primary-button" disabled={disabled} type="button" onClick={onAddDay}>加第一天</button></section>;
  return (
    <section className="editor-canvas" aria-label="行程畫布">
      <div className="editor-day-tabs" role="tablist">
        {days.map((day, index) => <DayTab active={day.id === activeDay.id} day={day} index={index} key={day.id} onClick={() => onActiveDay(day.id)} />)}
      </div>
      <header className="editor-day-heading">
        <div><p className="eyebrow">Day {activeIndex + 1} · {activeDay.date}</p><h2>{activeDay.theme || '未命名的一天'}</h2></div>
        <details className="day-menu">
          <summary>Day 選單</summary>
          <div className="menu-popover">
            <span className="menu-label">複製整天到…</span>
            <div className="menu-day-buttons">{days.map((day, index) => day.id === activeDay.id ? null : <button disabled={disabled} type="button" key={day.id} onClick={() => onCopyDay(day.id)}>複製整天到 Day {index + 1}</button>)}</div>
            <button disabled={disabled} type="button" onClick={onImportDay}>從其他行程匯入這天</button>
            <button disabled={disabled} type="button" onClick={onAddDay}>加一天</button>
            <button className="danger-text" disabled={disabled} type="button" onClick={onDeleteDay}>刪一天</button>
          </div>
        </details>
      </header>
      <SortableContext items={activeBlocks.map((block) => `block:${block.id}`)} strategy={verticalListSortingStrategy}>
        <div className="editor-block-list" data-over={isCanvasOver || undefined} ref={setCanvasRef}>
          {activeBlocks.length === 0 && <p className="canvas-empty">還沒有行程，從積木庫拖一個進來。</p>}
          {activeBlocks.map((block) => (
            <SortableBlock
              block={block}
              dayIndex={activeIndex}
              days={days}
              disabled={disabled}
              key={block.id}
              selected={block.id === selectedBlockId}
              onDelete={() => onDelete(block.id)}
              onDuplicate={(dayId) => onDuplicate(block.id, dayId)}
              onMove={(dayId, direction) => onMove(block.id, dayId, direction)}
              onSavePreset={() => onSavePreset(block.id)}
              onSelect={() => onSelect(block.id)}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
