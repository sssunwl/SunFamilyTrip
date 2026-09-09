import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFamilyTrips, getTrip } from '../../lib/db';
import type { GuideItem } from '../../types/trip';
import type { TripSummary } from '../../types/legacy';

export function ImportBuyablesDialog({ familyId, currentTripId, currentGuide, disabled, onClose, onImport }: {
  familyId: string; currentTripId: string; currentGuide: GuideItem[]; disabled: boolean;
  onClose: () => void; onImport: (items: GuideItem[]) => Promise<void>;
}) {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void getFamilyTrips(familyId).then((loaded) => setTrips(loaded.data.filter((trip) => trip.id !== currentTripId))).catch(() => setError('無法載入其他行程。')); }, [familyId, currentTripId]);

  async function run() {
    if (!selected) return;
    setWorking(true); setError('');
    try {
      const loaded = await getTrip(familyId, selected);
      const source = loaded.data?.guide.filter((item) => item.buyable) ?? [];
      const names = new Set(currentGuide.map((item) => item.name));
      const skipped = source.filter((item) => names.has(item.name)).map((item) => item.name);
      const additions = source.filter((item) => !names.has(item.name)).map((item) => ({ ...item, id: crypto.randomUUID(), source: 'guide' as const }));
      if (additions.length) await onImport(additions);
      setResult(`已新增 ${additions.length} 筆。${skipped.length ? `跳過重名：${skipped.join('、')}` : '沒有重名項目。'}`);
    } catch (caught) { setError((caught as Error).message || '匯入失敗。'); }
    finally { setWorking(false); }
  }

  return <div className="dialog-backdrop" role="presentation"><section className="editor-dialog editor-dialog-small" role="dialog" aria-modal="true" aria-labelledby="buy-import-title"><header><div><p className="eyebrow">附加，不覆蓋</p><h2 id="buy-import-title">從其他行程匯入必買</h2></div><button className="sheet-close" aria-label="關閉" type="button" onClick={onClose}><X aria-hidden /></button></header><label className="editor-field"><span>來源行程</span><select value={selected} onChange={(event) => { setSelected(event.target.value); setResult(''); }}><option value="">請選擇</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.meta.title}</option>)}</select></label>{result && <p className="notice-banner" role="status">{result}</p>}{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>關閉</button><button className="primary-button" disabled={disabled || working || !selected} type="button" onClick={() => void run()}>{working ? '匯入中…' : '匯入必買清單'}</button></div></section></div>;
}
