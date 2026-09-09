import { Check, ClipboardCopy, Settings2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { defaultCopyTextOptions, formatTripText, type CopyTextOptions, type CopyTextTrip } from '../lib/copyText';

const storageKey = 'songsong.copyTextOptions.v1';

function readOptions() {
  try {
    return { ...defaultCopyTextOptions, ...JSON.parse(localStorage.getItem(storageKey) ?? '{}') } as CopyTextOptions;
  } catch {
    return defaultCopyTextOptions;
  }
}

export function CopyTextButton({ trip, dayId }: { trip: CopyTextTrip; dayId: string }) {
  const [options, setOptions] = useState<CopyTextOptions>(readOptions);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = useMemo(() => formatTripText(trip, dayId, options), [trip, dayId, options]);

  useEffect(() => {
    if (!fallbackText) return;
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [fallbackText]);

  function update(patch: Partial<CopyTextOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function copy() {
    // iOS Safari 要求 writeText 在 click 的同步 call stack 內被呼叫；不要在這裡 await。
    const operation = navigator.clipboard?.writeText(text);
    if (!operation) {
      setFallbackText(text);
      return;
    }
    operation.then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => setFallbackText(text));
  }

  return (
    <div className="copy-control">
      <button className="copy-text-button" type="button" onClick={copy}>
        {copied ? <Check aria-hidden /> : <ClipboardCopy aria-hidden />}
        {copied ? '已複製' : options.wholeTrip ? '複製整趟文字版' : '複製文字版'}
      </button>
      <button className="copy-settings-button" aria-expanded={settingsOpen} aria-label="文字版複製選項" type="button" onClick={() => setSettingsOpen((open) => !open)}><Settings2 aria-hidden /></button>
      {settingsOpen && (
        <div className="copy-options">
          <label><span>內容</span><select value={options.full ? 'full' : 'compact'} onChange={(event) => update({ full: event.target.value === 'full' })}><option value="compact">精簡版</option><option value="full">完整版</option></select></label>
          <label><input checked={options.includeMaps} type="checkbox" onChange={(event) => update({ includeMaps: event.target.checked })} />含地圖連結</label>
          <label><input checked={options.includeEmoji} type="checkbox" onChange={(event) => update({ includeEmoji: event.target.checked })} />含 emoji</label>
          <label><input checked={options.wholeTrip} type="checkbox" onChange={(event) => update({ wholeTrip: event.target.checked })} />整趟複製</label>
        </div>
      )}
      {fallbackText && (
        <div className="dialog-backdrop" role="presentation">
          <section className="editor-dialog editor-dialog-small copy-fallback" role="dialog" aria-modal="true" aria-labelledby="copy-fallback-title">
            <header><div><p className="eyebrow">剪貼簿未開放</p><h2 id="copy-fallback-title">請長按選取複製</h2></div><button className="sheet-close" aria-label="關閉" type="button" onClick={() => setFallbackText('')}><X aria-hidden /></button></header>
            <textarea ref={textareaRef} readOnly rows={14} value={fallbackText} onFocus={(event) => event.currentTarget.select()} />
          </section>
        </div>
      )}
    </div>
  );
}
