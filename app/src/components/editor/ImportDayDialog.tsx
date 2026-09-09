import { useEffect, useState } from 'react';
import { friendlyDataError, getFamilyTrips, getTrip } from '../../lib/db';
import type { Block, Day } from '../../types/trip';
import type { TripSummary } from '../../types/legacy';

export function ImportDayDialog({ open, familyId, currentTripId, disabled, onClose, onImport }: {
  open: boolean; familyId: string; currentTripId: string; onClose: () => void;
  disabled: boolean;
  onImport: (day: Day, blocks: Block[]) => void;
}) {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripId, setTripId] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dayId, setDayId] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError(''); setTripId(''); setDayId(''); setDays([]);
    void getFamilyTrips(familyId).then((result) => setTrips(result.data.filter((trip) => trip.id !== currentTripId))).catch((caught) => setError(friendlyDataError(caught)));
  }, [open, familyId, currentTripId]);
  async function selectTrip(id: string) {
    setTripId(id); setDayId(''); setDays([]); setError('');
    if (!id) return;
    try {
      const result = await getTrip(familyId, id);
      setDays(result.data?.days ?? []);
      setBlocks(result.data?.blocks ?? []);
    } catch (caught) { setError(friendlyDataError(caught)); }
  }
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="editor-dialog editor-dialog-small" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id="import-dialog-title">從其他行程匯入這天</h2><button className="text-button" type="button" onClick={onClose}>取消</button></header>
        <label className="editor-field"><span>行程</span><select disabled={disabled} value={tripId} onChange={(event) => void selectTrip(event.target.value)}><option value="">請選擇</option>{trips.map((trip) => <option value={trip.id} key={trip.id}>{trip.meta.title}</option>)}</select></label>
        <label className="editor-field"><span>日期</span><select disabled={disabled || !tripId} value={dayId} onChange={(event) => setDayId(event.target.value)}><option value="">請選擇</option>{days.map((day, index) => <option value={day.id} key={day.id}>Day {index + 1} · {day.date} · {day.theme}</option>)}</select></label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={disabled || !dayId} type="button" onClick={() => { const day = days.find((item) => item.id === dayId); if (day) onImport(day, blocks.filter((block) => block.dayId === dayId)); }}>匯入到目前這天</button>
      </section>
    </div>
  );
}
