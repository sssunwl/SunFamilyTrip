import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { guideCsvColumns, previewGuideCsv } from '../../lib/csv';
import type { GuideItem } from '../../types/trip';

export function CsvImportDialog({ guide, disabled, onClose, onConfirm }: {
  guide: GuideItem[]; disabled: boolean; onClose: () => void;
  onConfirm: (rows: GuideItem[]) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [previewed, setPreviewed] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const rows = useMemo(() => previewed ? previewGuideCsv(text, guide) : [], [previewed, text, guide]);
  const valid = rows.filter((row) => row.item);
  const creates = rows.filter((row) => row.action === 'new').length;
  const updates = rows.filter((row) => row.action === 'update').length;

  async function readFile(file?: File) {
    if (!file) return;
    setText(await file.text());
    setPreviewed(false);
  }

  return (
    <div className="dialog-backdrop" role="presentation"><section className="editor-dialog csv-dialog" role="dialog" aria-modal="true" aria-labelledby="csv-title">
      <header><div><p className="eyebrow">大量新增</p><h2 id="csv-title">CSV 匯入</h2></div><button className="sheet-close" aria-label="關閉" type="button" onClick={onClose}><X aria-hidden /></button></header>
      <p className="panel-help">第一列是標題列。支援欄位：{guideCsvColumns.join(', ')}</p>
      <label className="editor-field"><span>貼上 CSV</span><textarea rows={9} value={text} onChange={(event) => { setText(event.target.value); setPreviewed(false); }} /></label>
      <label className="secondary-button file-button">選擇 CSV 檔<input accept=".csv,text/csv" type="file" onChange={(event) => void readFile(event.target.files?.[0])} /></label>
      <button className="primary-button" disabled={!text.trim()} type="button" onClick={() => setPreviewed(true)}>產生預覽</button>
      {previewed && <>
        <p className="import-summary">將新增 {creates} 筆、更新 {updates} 筆；錯誤 {rows.length - valid.length} 列。</p>
        <div className="csv-preview"><table><thead><tr><th>列</th><th>名稱</th><th>結果</th></tr></thead><tbody>{rows.map((row) => <tr data-error={row.action === 'error' || undefined} key={row.row}><td>{row.row}</td><td>{row.name || '—'}</td><td>{row.action === 'new' ? '新增' : row.action === 'update' ? '更新' : row.error}</td></tr>)}</tbody></table></div>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose}>取消</button><button className="primary-button" disabled={disabled || working || valid.length === 0} type="button" onClick={() => { setWorking(true); setError(''); void onConfirm(valid.map((row) => row.item!)).catch((caught) => { setError((caught as Error).message || '匯入失敗'); setWorking(false); }); }}>{working ? '寫入中…' : `確認寫入 ${valid.length} 筆`}</button></div>
      </>}
    </section></div>
  );
}
