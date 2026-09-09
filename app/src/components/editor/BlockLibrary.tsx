import { useDraggable } from '@dnd-kit/core';
import type { BlockType } from '../../types/trip';
import { blockTemplates } from '../../editor/blockTemplates';

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

export function BlockLibrary({ onAdd, disabled }: { onAdd: (type: BlockType) => void; disabled: boolean }) {
  return (
    <div className="block-library">
      <div className="panel-heading"><p className="eyebrow">積木庫</p><h2>加一段安排</h2></div>
      <p className="panel-help">點一下加到目前這天末尾，也可拖進畫布。</p>
      <div className="library-list">
        {blockTemplates.map((template) => (
          <LibraryItem {...template} disabled={disabled} key={template.type} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}
