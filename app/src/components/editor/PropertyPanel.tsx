import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { importGoogleMapsPlace, isShortGoogleMapsUrl } from '../../lib/maps';
import type { Block, SplitGroup, TripMember } from '../../types/trip';

function TextField({ label, value, type = 'text', disabled, onChange }: {
  label: string; value: string | number; type?: string; disabled: boolean;
  onChange: (value: string) => void;
}) {
  return <label className="editor-field"><span>{label}</span><input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Toggle({ label, checked, disabled, onChange }: {
  label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className="toggle-field"><input checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function MemberChecks({ members, selected, disabled, onChange }: {
  members: TripMember[]; selected: string[]; disabled: boolean; onChange: (ids: string[]) => void;
}) {
  return (
    <div className="member-checks">
      {members.map((member) => <label key={member.id}><input checked={selected.includes(member.id)} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked ? [...selected, member.id] : selected.filter((id) => id !== member.id))} /><span>{member.avatar} {member.name}</span></label>)}
    </div>
  );
}

function SplitEditor({ block, members, disabled, onUpdate }: {
  block: Block; members: TripMember[]; disabled: boolean; onUpdate: (patch: Partial<Block>) => void;
}) {
  const groups = block.groups ?? [];
  const updateGroup = (index: number, patch: Partial<SplitGroup>) => onUpdate({ groups: groups.map((group, groupIndex) => groupIndex === index ? { ...group, ...patch } : group) });
  return (
    <fieldset className="panel-fieldset"><legend>分隊安排</legend>
      {groups.map((group, index) => <div className="split-editor" key={`${block.id}-${index}`}>
        <div className="split-editor-heading"><strong>第 {index + 1} 組</strong><button className="danger-text" disabled={disabled || groups.length <= 2} type="button" onClick={() => onUpdate({ groups: groups.filter((_, groupIndex) => groupIndex !== index) })}>刪組</button></div>
        <TextField disabled={disabled} label="組名" value={group.label} onChange={(label) => updateGroup(index, { label })} />
        <label className="editor-field"><span>說明</span><textarea disabled={disabled} value={group.desc} onChange={(event) => updateGroup(index, { desc: event.target.value })} /></label>
        <span className="field-label">成員</span><MemberChecks disabled={disabled} members={members} selected={group.memberIds} onChange={(memberIds) => updateGroup(index, { memberIds })} />
      </div>)}
      <button className="secondary-button" disabled={disabled} type="button" onClick={() => onUpdate({ groups: [...groups, { label: `第 ${groups.length + 1} 組`, desc: '', memberIds: [] }] })}>＋ 加一組</button>
    </fieldset>
  );
}

export function PropertyPanel({ block, members, disabled, onUpdate, onTimeChange, onClose }: {
  block: Block | null; members: TripMember[]; disabled: boolean;
  onUpdate: (patch: Partial<Block>) => void; onTimeChange: (time: string) => void; onClose: () => void;
}) {
  const [placeName, setPlaceName] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [placeMessage, setPlaceMessage] = useState('');
  useEffect(() => {
    setPlaceName(block?.place?.name ?? '');
    setMapUrl(block?.place?.mapUrl ?? '');
    setPlaceMessage('');
  }, [block?.id]);
  if (!block) return <aside className="property-panel property-empty"><p>點一張積木卡，這裡會顯示可編輯欄位。</p></aside>;

  async function handlePlaceImport() {
    setPlaceMessage('解析中…');
    try {
      const place = await importGoogleMapsPlace(placeName, mapUrl);
      onUpdate({ place });
      setPlaceName(place.name);
      setMapUrl(place.mapUrl ?? mapUrl);
      setPlaceMessage(place.lat !== undefined ? `已解析座標 ${place.lat}, ${place.lng}` : isShortGoogleMapsUrl(mapUrl) ? '短連結解析服務尚未設定，已保留原連結。' : '未找到座標，已保留店名與連結。');
    } catch {
      onUpdate({ place: { name: placeName || mapUrl, mapUrl } });
      setPlaceMessage('解析失敗，已保留店名與原連結。');
    }
  }

  return (
    <aside className="property-panel" aria-label="積木屬性面板">
      <div className="property-heading"><div><p className="eyebrow">積木設定</p><h2>{block.title || '未命名積木'}</h2></div><button className="sheet-close" type="button" aria-label="關閉設定" onClick={onClose}><X aria-hidden /></button></div>
      <div className="property-scroll">
        <div className="field-row"><TextField disabled={disabled} label="時間" type="time" value={block.time} onChange={onTimeChange} /><TextField disabled={disabled} label="時長（分鐘）" type="number" value={block.durationMin} onChange={(value) => onUpdate({ durationMin: Math.max(0, Number(value) || 0) })} /></div>
        <TextField disabled={disabled} label="標題" value={block.title} onChange={(title) => onUpdate({ title })} />
        <label className="editor-field"><span>描述</span><textarea disabled={disabled} rows={4} value={block.desc ?? ''} onChange={(event) => onUpdate({ desc: event.target.value })} /></label>
        <TextField disabled={disabled} label="⚠️ 提示" value={block.warn ?? ''} onChange={(warn) => onUpdate({ warn })} />

        {block.type !== 'split' && <fieldset className="panel-fieldset"><legend>負責成員</legend><p className="field-hint">沒有勾選代表全團。</p><MemberChecks disabled={disabled} members={members} selected={block.assignees ?? []} onChange={(assignees) => onUpdate({ assignees })} /></fieldset>}
        {block.type === 'transport' && <fieldset className="panel-fieldset"><legend>交通</legend><TextField disabled={disabled} label="從" value={block.from ?? ''} onChange={(from) => onUpdate({ from })} /><TextField disabled={disabled} label="到" value={block.to ?? ''} onChange={(to) => onUpdate({ to })} /><label className="editor-field"><span>方式</span><select disabled={disabled} value={block.mode ?? '步行'} onChange={(event) => onUpdate({ mode: event.target.value as Block['mode'] })}>{['步行','地鐵','的士','巴士','火車','航班','船'].map((mode) => <option key={mode}>{mode}</option>)}</select></label><TextField disabled={disabled} label="車資" value={block.fare ?? ''} onChange={(fare) => onUpdate({ fare })} /></fieldset>}
        {block.type === 'food' && <fieldset className="panel-fieldset"><legend>餐飲</legend><label className="editor-field"><span>餐別</span><select disabled={disabled} value={block.mealType ?? '午'} onChange={(event) => onUpdate({ mealType: event.target.value as Block['mealType'] })}>{['早','午','晚','宵夜','咖啡'].map((meal) => <option key={meal}>{meal}</option>)}</select></label><TextField disabled={disabled} label="預算" value={block.budget ?? ''} onChange={(budget) => onUpdate({ budget })} /><Toggle checked={Boolean(block.needReserve)} disabled={disabled} label="需要訂位" onChange={(needReserve) => onUpdate({ needReserve })} /></fieldset>}
        {block.type === 'sight' && <fieldset className="panel-fieldset"><legend>景點</legend><TextField disabled={disabled} label="票價" value={block.ticketPrice ?? ''} onChange={(ticketPrice) => onUpdate({ ticketPrice })} /><TextField disabled={disabled} label="營業時間" value={block.openHours ?? ''} onChange={(openHours) => onUpdate({ openHours })} /><Toggle checked={Boolean(block.needBooking)} disabled={disabled} label="需要預約" onChange={(needBooking) => onUpdate({ needBooking })} /></fieldset>}
        {block.type === 'shopping' && <fieldset className="panel-fieldset"><legend>購物</legend><TextField disabled={disabled} label="預算" value={block.budget ?? ''} onChange={(budget) => onUpdate({ budget })} /><Toggle checked={Boolean(block.taxRefund)} disabled={disabled} label="可退稅" onChange={(taxRefund) => onUpdate({ taxRefund })} /></fieldset>}
        {block.type === 'hotel' && <fieldset className="panel-fieldset"><legend>住宿</legend><div className="field-row"><TextField disabled={disabled} label="入住" type="time" value={block.checkIn ?? ''} onChange={(checkIn) => onUpdate({ checkIn })} /><TextField disabled={disabled} label="退房" type="time" value={block.checkOut ?? ''} onChange={(checkOut) => onUpdate({ checkOut })} /></div><TextField disabled={disabled} label="地址" value={block.address ?? ''} onChange={(address) => onUpdate({ address })} /><TextField disabled={disabled} label="當地地址" value={block.localAddress ?? ''} onChange={(localAddress) => onUpdate({ localAddress })} /><TextField disabled={disabled} label="前往方式" value={block.directions ?? ''} onChange={(directions) => onUpdate({ directions })} /></fieldset>}
        {block.type === 'meetup' && <fieldset className="panel-fieldset"><legend>集合</legend><TextField disabled={disabled} label="集合點" value={block.meetingPoint ?? ''} onChange={(meetingPoint) => onUpdate({ meetingPoint })} /><TextField disabled={disabled} label="聯絡人" value={block.contact ?? ''} onChange={(contact) => onUpdate({ contact })} /></fieldset>}
        {block.type === 'todo' && <fieldset className="panel-fieldset"><legend>待辦提醒</legend><TextField disabled={disabled} label="提醒日期" type="date" value={block.reminderDate ?? ''} onChange={(reminderDate) => onUpdate({ reminderDate })} /><span className="field-label">負責人</span><MemberChecks disabled={disabled} members={members} selected={block.responsibleMemberIds ?? []} onChange={(responsibleMemberIds) => onUpdate({ responsibleMemberIds })} /></fieldset>}
        {block.type === 'split' && <SplitEditor block={block} disabled={disabled} members={members} onUpdate={onUpdate} />}

        <fieldset className="panel-fieldset"><legend>地點匯入</legend><TextField disabled={disabled} label="店名" value={placeName} onChange={setPlaceName} /><label className="editor-field"><span>Google Maps 連結</span><textarea disabled={disabled} rows={3} value={mapUrl} onChange={(event) => setMapUrl(event.target.value)} /></label><button className="secondary-button" disabled={disabled || (!placeName && !mapUrl)} type="button" onClick={() => void handlePlaceImport()}>解析並套用</button>{placeMessage && <p className="field-message" role="status">{placeMessage}</p>}{block.place && <div className="place-result"><strong>{block.place.name}</strong>{block.place.localName && <span>{block.place.localName}</span>}{block.place.lat !== undefined && <span className="mono">{block.place.lat}, {block.place.lng}</span>}<button disabled title="P4 接 Google Places API" type="button">補齊詳細資料</button></div>}</fieldset>
      </div>
    </aside>
  );
}
