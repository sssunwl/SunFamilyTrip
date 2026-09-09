import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { GuideItem } from '../../types/trip';

export const affiliateDisclosure = '透過此連結購買，我可能獲得少量回饋，價格不變';
const emojis = ['🍜', '🛍️', '💊', '🧴', '🍪', '🎁', '📍', '✨'];
const platforms = ['Amazon JP', '樂天', 'Qoo10', 'Shopee'];

export function newGuideItem(): GuideItem {
  return { id: crypto.randomUUID(), category: '', name: '', images: [], buyable: false, source: 'manual' };
}

export function GuideItemForm({ initial, categories, disabled, onCancel, onSave, onUpload }: {
  initial: GuideItem;
  categories: string[];
  disabled: boolean;
  onCancel: () => void;
  onSave: (item: GuideItem) => Promise<void>;
  onUpload: (file: File, item: GuideItem) => Promise<string>;
}) {
  const [item, setItem] = useState<GuideItem>(() => ({ ...initial, images: [...initial.images] }));
  const [imageUrl, setImageUrl] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  function patch(next: Partial<GuideItem>) { setItem((current) => ({ ...current, ...next })); }
  function addUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    patch({ images: [...item.images, url] });
    setImageUrl('');
  }

  async function upload(file?: File) {
    if (!file) return;
    setWorking(true); setError('');
    try {
      const url = await onUpload(file, item);
      patch({ images: [...item.images, url] });
    } catch (caught) {
      setError((caught as Error).message || '圖片上傳失敗。');
    } finally { setWorking(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!item.name.trim()) { setError('請填名稱。'); return; }
    setWorking(true); setError('');
    try { await onSave({ ...item, name: item.name.trim(), category: item.category.trim() }); }
    catch (caught) { setError((caught as Error).message || '儲存失敗。'); setWorking(false); }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="editor-dialog guide-form" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="guide-form-title">
        <header><div><p className="eyebrow">指南項目</p><h2 id="guide-form-title">{initial.name ? '編輯項目' : '新增項目'}</h2></div><button className="sheet-close" aria-label="關閉" type="button" onClick={onCancel}><X aria-hidden /></button></header>
        <div className="emoji-picker" aria-label="名稱 emoji">
          <span>名稱 emoji</span>{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => patch({ name: `${emoji} ${item.name.replace(/^\p{Extended_Pictographic}\uFE0F?\s*/u, '')}`.trim() })}>{emoji}</button>)}
        </div>
        <div className="field-row">
          <label className="editor-field"><span>分類（可自由輸入）</span><input list="guide-categories" value={item.category} onChange={(event) => patch({ category: event.target.value })} /><datalist id="guide-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
          <label className="editor-field"><span>名稱 *</span><input value={item.name} onChange={(event) => patch({ name: event.target.value })} /></label>
        </div>
        <div className="field-row"><label className="editor-field"><span>當地名稱</span><input value={item.localName ?? ''} onChange={(event) => patch({ localName: event.target.value })} /></label><label className="editor-field"><span>標籤</span><input value={item.tag ?? ''} onChange={(event) => patch({ tag: event.target.value })} /></label></div>
        <label className="editor-field"><span>短註</span><input value={item.note ?? ''} onChange={(event) => patch({ note: event.target.value })} /></label>
        <label className="editor-field"><span>描述</span><textarea rows={4} value={item.desc ?? ''} onChange={(event) => patch({ desc: event.target.value })} /></label>
        <label className="editor-field"><span>給店員看的文字</span><input value={item.showText ?? ''} onChange={(event) => patch({ showText: event.target.value })} /></label>
        <label className="toggle-field"><input checked={item.buyable} type="checkbox" onChange={(event) => patch({ buyable: event.target.checked })} /><span>加入必買清單</span></label>

        <fieldset className="panel-fieldset"><legend>圖片</legend>
          <div className="inline-fields"><input aria-label="圖片 URL" placeholder="貼上圖片 URL" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /><button className="secondary-button" type="button" onClick={addUrl}>加入 URL</button><label className="secondary-button file-button"><Upload aria-hidden />上傳圖片<input accept="image/*" disabled={working || disabled} type="file" onChange={(event) => void upload(event.target.files?.[0])} /></label></div>
          {item.images.length > 0 && <div className="form-image-list">{item.images.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt="" /><button aria-label="移除圖片" type="button" onClick={() => patch({ images: item.images.filter((_, imageIndex) => imageIndex !== index) })}><X aria-hidden /></button></div>)}</div>}
        </fieldset>

        <fieldset className="panel-fieldset"><legend>價格與聯盟連結</legend>
          <div className="field-row"><label className="editor-field"><span>價格</span><input min="0" step="any" type="number" value={item.price?.amount ?? ''} onChange={(event) => patch({ price: event.target.value ? { amount: Number(event.target.value), currency: item.price?.currency ?? '' } : null })} /></label><label className="editor-field"><span>幣別</span><input value={item.price?.currency ?? ''} onChange={(event) => patch({ price: item.price ? { ...item.price, currency: event.target.value } : { amount: 0, currency: event.target.value } })} /></label></div>
          <label className="editor-field"><span>聯盟連結</span><input type="url" value={item.affiliate?.url ?? ''} onChange={(event) => patch({ affiliate: event.target.value ? { url: event.target.value, platform: item.affiliate?.platform ?? platforms[0], disclosure: affiliateDisclosure } : null })} /></label>
          <label className="editor-field"><span>平台</span><select disabled={!item.affiliate} value={item.affiliate?.platform ?? platforms[0]} onChange={(event) => patch({ affiliate: item.affiliate ? { ...item.affiliate, platform: event.target.value, disclosure: affiliateDisclosure } : null })}>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
          {item.affiliate && <p className="affiliate-disclosure">{affiliateDisclosure}</p>}
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <footer className="dialog-actions"><button className="secondary-button" type="button" onClick={onCancel}>取消</button><button className="primary-button" disabled={working || disabled} type="submit">{working ? '處理中…' : '儲存'}</button></footer>
      </form>
    </div>
  );
}
