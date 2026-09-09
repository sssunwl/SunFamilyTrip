import type { User } from 'firebase/auth';
import { ArrowLeft, Check, FileSpreadsheet, Images, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CsvImportDialog } from '../components/guide/CsvImportDialog';
import { GuideItemForm, affiliateDisclosure, newGuideItem } from '../components/guide/GuideItemForm';
import { ImportBuyablesDialog } from '../components/guide/ImportBuyablesDialog';
import {
  VersionConflictError,
  friendlyDataError,
  getFamily,
  getTrip,
  saveTrip,
  setShoppingChecked,
  subscribeShopping,
  type DataSource,
} from '../lib/db';
import { uploadGuideImage } from '../lib/images';
import type { GuideItem } from '../types/trip';
import type { TripDocument } from '../types/legacy';

function cleanTrip(trip: TripDocument) {
  return JSON.parse(JSON.stringify(trip)) as TripDocument;
}

export function Guide({ user, authReady }: { user: User | null; authReady: boolean }) {
  const { family: familyId = '', trip: tripId = '' } = useParams();
  const [trip, setTrip] = useState<TripDocument | null>();
  const [isLeader, setIsLeader] = useState(false);
  const [source, setSource] = useState<DataSource>('firestore');
  const [checked, setChecked] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<GuideItem | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setTrip(undefined); setError('');
    Promise.all([getTrip(familyId, tripId), getFamily(familyId)]).then(([tripResult, familyResult]) => {
      if (!active) return;
      setTrip(tripResult.data);
      setSource(tripResult.source === 'local' || familyResult.source === 'local' ? 'local' : 'firestore');
      setIsLeader(Boolean(user && familyResult.data?.leaders.includes(user.uid)));
    }).catch((caught) => { if (active) { setError(friendlyDataError(caught)); setTrip(null); } });
    return () => { active = false; };
  }, [familyId, tripId, user, loadKey]);

  useEffect(() => subscribeShopping(familyId, tripId, setChecked, () => setMessage('必買勾選暫時無法同步。')), [familyId, tripId]);

  const categories = useMemo(() => Array.from(new Set((trip?.guide ?? []).map((item) => item.category).filter(Boolean))), [trip]);
  const canEdit = authReady && isLeader && source === 'firestore';

  async function commitGuide(nextGuide: GuideItem[], success: string) {
    if (!trip || !user || !canEdit) throw new Error('沒有編輯權限。');
    setSaving(true); setMessage('');
    try {
      const nextTrip = cleanTrip({ ...trip, guide: nextGuide });
      const nextVersion = await saveTrip(familyId, tripId, nextTrip, trip.version, user.uid);
      setTrip({ ...nextTrip, version: nextVersion, updatedAt: Date.now(), updatedBy: user.uid });
      setEditing(null); setCsvOpen(false);
      setMessage(success);
    } catch (caught) {
      if (caught instanceof VersionConflictError) throw new Error('有人剛改過這趟行程，請重新載入後再試。');
      throw caught;
    } finally { setSaving(false); }
  }

  async function saveItem(item: GuideItem) {
    if (!trip) return;
    const exists = trip.guide.some((current) => current.id === item.id);
    const guide = exists ? trip.guide.map((current) => current.id === item.id ? item : current) : [...trip.guide, item];
    await commitGuide(guide, exists ? '項目已更新。' : '項目已新增。');
  }

  async function importCsv(items: GuideItem[]) {
    if (!trip) return;
    const byName = new Map(items.map((item) => [item.name, item]));
    const existingNames = new Set(trip.guide.map((item) => item.name));
    const guide = trip.guide.map((item) => byName.get(item.name) ?? item);
    items.filter((item) => !existingNames.has(item.name)).forEach((item) => guide.push(item));
    await commitGuide(guide, `CSV 已寫入 ${items.length} 筆。`);
  }

  async function toggle(itemId: string) {
    const next = !checked[itemId];
    setChecked((current) => ({ ...current, [itemId]: next ? '✓' : undefined }));
    try { await setShoppingChecked(familyId, tripId, itemId, next); }
    catch { setChecked((current) => ({ ...current, [itemId]: next ? undefined : '✓' })); setMessage('勾選同步失敗，請再試一次。'); }
  }

  if (trip === undefined) return <main className="page"><p className="loading">正在載入指南…</p></main>;
  if (!trip) return <main className="page page-narrow"><h1>載入失敗</h1><p className="error-state">{error || '找不到行程。'}</p><button className="primary-button" type="button" onClick={() => setLoadKey((key) => key + 1)}>重試</button></main>;

  return (
    <main className="page guide-page">
      {source === 'local' && <div className="dev-banner" role="alert">開發模式：正在使用本機遷移資料，不是線上資料；編輯已停用</div>}
      <Link className="back-link" to={`/f/${familyId}/t/${tripId}`}><ArrowLeft size={16} aria-hidden />返回行程</Link>
      <header className="guide-header"><div><p className="eyebrow">{trip.meta.title}</p><h1>指南＆必買</h1><p className="lede">把想吃、想逛和要買的東西放在同一份清單。</p></div>{canEdit && <div className="guide-actions"><button className="primary-button" type="button" onClick={() => setEditing(newGuideItem())}><Plus aria-hidden />新增項目</button><button className="secondary-button" type="button" onClick={() => setCsvOpen(true)}><FileSpreadsheet aria-hidden />CSV 匯入</button><button className="secondary-button" type="button" onClick={() => setImportOpen(true)}><ShoppingBag aria-hidden />從其他行程匯入必買</button></div>}</header>
      {authReady && user && !isLeader && <p className="permission-note">你不是這個家庭的領隊；指南維持唯讀。</p>}
      {message && <p className="notice-banner" role="status">{message}</p>}
      <div className="guide-list">
        {trip.guide.map((item) => <article className="guide-card" key={item.id}>
          {item.images[0] ? <img className="guide-card-image" src={item.images[0]} alt={item.name} /> : <div className="guide-card-image guide-card-placeholder"><Images aria-hidden /></div>}
          <div className="guide-card-body"><p className="guide-category">{item.category || '未分類'}{item.tag && <span>{item.tag}</span>}</p><h2>{item.name}</h2>{item.localName && <p className="local-name">{item.localName}</p>}{item.note && <p className="guide-note">{item.note}</p>}{item.desc && <p className="guide-description">{item.desc}</p>}{item.showText && <p className="show-text">給店員看：<strong>{item.showText}</strong></p>}{item.price && <p className="guide-price mono">{item.price.currency} {item.price.amount.toLocaleString()}</p>}
            {item.buyable ? <label className="shopping-check"><input checked={Boolean(checked[item.id])} type="checkbox" onChange={() => void toggle(item.id)} /><span>{checked[item.id] ? <Check aria-hidden /> : null}已買到</span></label> : canEdit && <button className="text-button" type="button" onClick={() => void saveItem({ ...item, buyable: true, source: 'guide' }).catch((caught) => setMessage((caught as Error).message))}>一鍵轉為必買</button>}
            {item.affiliate && <div className="affiliate-box"><a className="primary-link" href={item.affiliate.url} target="_blank" rel="nofollow sponsored noreferrer">到 {item.affiliate.platform} 查看</a><p className="affiliate-disclosure">{affiliateDisclosure}</p></div>}
            {canEdit && <div className="card-actions"><button type="button" onClick={() => setEditing(item)}><Pencil aria-hidden />編輯</button><button className="danger-text" type="button" onClick={() => { if (window.confirm(`確定刪除「${item.name}」？`)) void commitGuide(trip.guide.filter((current) => current.id !== item.id), '項目已刪除。').catch((caught) => setMessage((caught as Error).message)); }}><Trash2 aria-hidden />刪除</button></div>}
          </div>
        </article>)}
      </div>
      {editing && <GuideItemForm categories={categories} disabled={saving} initial={editing} onCancel={() => setEditing(null)} onSave={saveItem} onUpload={(file, item) => uploadGuideImage(familyId, tripId, item.id, item.images.length + 1, file)} />}
      {csvOpen && <CsvImportDialog disabled={saving} guide={trip.guide} onClose={() => setCsvOpen(false)} onConfirm={importCsv} />}
      {importOpen && <ImportBuyablesDialog currentGuide={trip.guide} currentTripId={tripId} disabled={saving} familyId={familyId} onClose={() => setImportOpen(false)} onImport={(items) => commitGuide([...trip.guide, ...items], `已從其他行程新增 ${items.length} 筆。`)} />}
    </main>
  );
}
