import { useDraggable } from '@dnd-kit/core';
import type { BlockType } from '../../types/trip';
import { blockTemplates } from '../../editor/blockTemplates';
import type { FamilyPreset } from '../../lib/db';

function LibraryItem({
  type, label, icon, preview, onAdd, disabled,
}: {
  type: BlockType; label: string; icon: string; preview: string;
  onAdd: (type: BlockType) => void; disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${type}`,
    data: { kind: 'library', type },
    disabled,
  });
  return (
    <button
      className="library-item"
      data-dragging={isDragging || undefined}
      disabled={disabled}
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(type)}
      {...attributes}
      {...listeners}
    >
      <span className="library-icon" aria-hidden>{icon}</span>
      <span><strong>{label}</strong><small>{preview}</small></span>
      <span className="library-add" aria-hidden>＋</span>
    </button>
  );
}

export function BlockLibrary({ onAdd, onAddPreset, onRenamePreset, onDeletePreset, presets, disabled }: {
  onAdd: (type: BlockType) => void;
  onAddPreset: (preset: FamilyPreset) => void;
  onRenamePreset: (preset: FamilyPreset) => void;
  onDeletePreset: (preset: FamilyPreset) => void;
  presets: FamilyPreset[];
  disabled: boolean;
}) {
  return (
    <div className="block-library">
      <div className="panel-heading"><p className="eyebrow">積木庫</p><h2>加一段安排</h2></div>
      <p className="panel-help">點一下加到目前這天末尾，也可拖進畫布。</p>
      <div className="library-list">
        {blockTemplates.map((template) => (
          <LibraryItem {...template} disabled={disabled} key={template.type} onAdd={onAdd} />
        ))}
      </div>
      <section className="custom-presets" aria-labelledby="custom-presets-title">
        <div className="panel-heading"><p className="eyebrow">＋ 自訂範本</p><h2 id="custom-presets-title">家庭範本</h2></div>
        {presets.length === 0 ? <p className="panel-help">還沒有家庭範本。</p> : <div className="preset-list">{presets.map((preset) => <div className="preset-row" key={preset.id}><button disabled={disabled} type="button" onClick={() => onAddPreset(preset)}><span aria-hidden>{blockTemplates.find((item) => item.type === preset.type)?.icon ?? '🧩'}</span><strong>{preset.title}</strong><span aria-hidden>＋</span></button><div><button disabled={disabled} type="button" onClick={() => onRenamePreset(preset)}>改名</button><button className="danger-text" disabled={disabled} type="button" onClick={() => onDeletePreset(preset)}>刪除</button></div></div>)}</div>}
      </section>
    </div>
  );
}
