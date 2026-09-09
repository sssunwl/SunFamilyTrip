import { X } from 'lucide-react';
import { useState } from 'react';
import { createTrip, getTrip } from '../lib/db';
import type { Family, Trip } from '../types/trip';
import type { TripSummary } from '../types/legacy';

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function weekday(date: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(`${date}T12:00:00`).getDay()];
}

export function CreateTripDialog({ family, trips, uid, onClose, onCreated }: {
  family: Family; trips: TripSummary[]; uid: string; onClose: () => void; onCreated: (tripId: string) => void;
}) {
  const [form, setForm] = useState({ title: '', city: '', country: '', startDate: '', endDate: '', currency: '', copyFrom: '' });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const patch = (next: Partial<typeof form>) => setForm((current) => ({ ...current, ...next }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.endDate < form.startDate) { setError('結束日期不可早於開始日期。'); return; }
    setWorking(true); setError('');
    try {
      const source = form.copyFrom ? (await getTrip(family.id, form.copyFrom)).data : null;
      const dates = datesBetween(form.startDate, form.endDate);
      const days: Trip['days'] = dates.map((date, index) => ({
        id: crypto.randomUUID(), date, weekday: weekday(date),
        theme: source?.days[index]?.theme ?? `Day ${index + 1}`,
        highlights: source?.days[index]?.highlights ?? '',
      }));
      const result = await createTrip(family.id, {
        title: form.title,
        city: form.city,
        country: form.country,
        currency: form.currency,
        startDate: form.startDate,
        endDate: form.endDate,
      }, days, source?.members ?? family.members, uid);
      onCreated(result.tripId);
    } catch (caught) { setError((caught as Error).message || '建立行程失敗。'); setWorking(false); }
  }

  return <div className="dialog-backdrop" role="presentation"><form className="editor-dialog editor-dialog-small" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-trip-title"><header><div><p className="eyebrow">{family.shortName}</p><h2 id="create-trip-title">開新行程</h2></div><button className="sheet-close" aria-label="關閉" type="button" onClick={onClose}><X aria-hidden /></button></header><label className="editor-field"><span>標題</span><input required value={form.title} onChange={(event) => patch({ title: event.target.value })} /></label><div className="field-row"><label className="editor-field"><span>城市</span><input required value={form.city} onChange={(event) => patch({ city: event.target.value })} /></label><label className="editor-field"><span>國家</span><input required value={form.country} onChange={(event) => patch({ country: event.target.value })} /></label></div><div className="field-row"><label className="editor-field"><span>開始日期</span><input required type="date" value={form.startDate} onChange={(event) => patch({ startDate: event.target.value, endDate: form.endDate || event.target.value })} /></label><label className="editor-field"><span>結束日期</span><input min={form.startDate} required type="date" value={form.endDate} onChange={(event) => patch({ endDate: event.target.value })} /></label></div><label className="editor-field"><span>幣別</span><input placeholder="例如 JPY、KRW" required value={form.currency} onChange={(event) => patch({ currency: event.target.value.toUpperCase() })} /></label><label className="editor-field"><span>從既有行程複製結構（選填）</span><select value={form.copyFrom} onChange={(event) => patch({ copyFrom: event.target.value })}><option value="">不複製</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.meta.title}</option>)}</select></label><p className="field-hint">只沿用每日主題、重點與成員；日期會依新行程重新生成，不會複製積木。</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" disabled={working} type="submit">{working ? '建立中…' : '建立行程'}</button></div></form></div>;
}
