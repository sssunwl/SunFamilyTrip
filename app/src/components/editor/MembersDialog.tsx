import { useEffect, useState } from 'react';
import type { TripMember } from '../../types/trip';

export function MembersDialog({ open, familyMembers, tripMembers, disabled, onClose, onSave }: {
  open: boolean; familyMembers: TripMember[]; tripMembers: TripMember[];
  disabled: boolean;
  onClose: () => void; onSave: (members: TripMember[]) => void;
}) {
  const [draft, setDraft] = useState<TripMember[]>(tripMembers);
  useEffect(() => { if (open) setDraft(tripMembers.map((member) => ({ ...member }))); }, [open, tripMembers]);
  if (!open) return null;
  const toggle = (member: TripMember, checked: boolean) => setDraft((current) => checked
    ? [...current, { ...member, role: member.role ?? member.defaultRole ?? '' }]
    : current.filter((item) => item.id !== member.id));
  const update = (id: string, patch: Partial<TripMember>) => setDraft((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="members-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">行程設定</p><h2 id="members-dialog-title">同行成員</h2></div><button className="text-button" type="button" onClick={onClose}>取消</button></header>
        <p className="panel-help">這趟的名稱、頭像與角色可獨立於家庭成員池。</p>
        <div className="member-editor-list">
          {familyMembers.map((familyMember) => {
            const member = draft.find((item) => item.id === familyMember.id);
            return <div className="member-editor-row" key={familyMember.id}>
              <label className="member-participation"><input checked={Boolean(member)} disabled={disabled} type="checkbox" onChange={(event) => toggle(familyMember, event.target.checked)} /><span>{familyMember.avatar} {familyMember.name}</span></label>
              {member && <div className="member-editor-fields"><label>顯示名稱<input disabled={disabled} value={member.name} onChange={(event) => update(member.id, { name: event.target.value })} /></label><label>頭像 emoji<input disabled={disabled} value={member.avatar} onChange={(event) => update(member.id, { avatar: event.target.value })} /></label><label>角色<input disabled={disabled} value={member.role ?? ''} onChange={(event) => update(member.id, { role: event.target.value })} /></label><label className="toggle-field"><input checked={Boolean(member.excludeFromSplit)} disabled={disabled} type="checkbox" onChange={(event) => update(member.id, { excludeFromSplit: event.target.checked })} /><span>分隊時預設排除</span></label></div>}
            </div>;
          })}
        </div>
        <button className="primary-button" disabled={disabled} type="button" onClick={() => onSave(draft)}>套用成員設定</button>
      </section>
    </div>
  );
}
