import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { User } from 'firebase/auth';
import { ArrowLeft, BookOpen, Boxes, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlockLibrary } from '../components/editor/BlockLibrary';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { ImportDayDialog } from '../components/editor/ImportDayDialog';
import { MembersDialog } from '../components/editor/MembersDialog';
import { PropertyPanel } from '../components/editor/PropertyPanel';
import { createBlock, normalizeOrders } from '../editor/blockTemplates';
import {
  VersionConflictError,
  deleteFamilyPreset,
  friendlyDataError,
  getFamily,
  getFamilyPresets,
  getTrip,
  renameFamilyPreset,
  saveFamilyPreset,
  saveTrip,
  type DataSource,
  type FamilyPreset,
} from '../lib/db';
import type { Block, BlockType, Day, Family, TripMember } from '../types/trip';
import type { TripDocument } from '../types/legacy';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict' | 'offline';

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

function minutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function shiftedTime(time: string, delta: number) {
  const value = minutes(time);
  if (value === null) return time;
  const shifted = (value + delta + 1440) % 1440;
  return `${String(Math.floor(shifted / 60)).padStart(2, '0')}:${String(shifted % 60).padStart(2, '0')}`;
}

function weekday(date: string) {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(`${date}T12:00:00`).getDay()];
}

export function TripEditor({ user, authReady }: { user: User | null; authReady: boolean }) {
  const { family: familyId = '', trip: tripId = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const [trip, setTrip] = useState<TripDocument | null>();
  const [family, setFamily] = useState<Family | null>();
  const [presets, setPresets] = useState<FamilyPreset[]>([]);
  const [source, setSource] = useState<DataSource>('firestore');
  const [error, setError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [activeDayId, setActiveDayId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [revision, setRevision] = useState(0);
  const [savePulse, setSavePulse] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tripRef = useRef<TripDocument | null>(null);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const savedVersionRef = useRef(0);
  const savingRef = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let active = true;
    setTrip(undefined); setFamily(undefined); setError('');
    Promise.all([getTrip(familyId, tripId), getFamily(familyId), getFamilyPresets(familyId).catch(() => [])])
      .then(([tripResult, familyResult, presetResult]) => {
        if (!active) return;
        const loadedTrip = tripResult.data;
        setTrip(loadedTrip); setFamily(familyResult.data);
        setPresets(presetResult);
        setSource(tripResult.source === 'local' || familyResult.source === 'local' ? 'local' : 'firestore');
        if (loadedTrip) {
          tripRef.current = loadedTrip;
          savedVersionRef.current = loadedTrip.version;
          revisionRef.current = 0; savedRevisionRef.current = 0; setRevision(0);
          setLastSavedAt(loadedTrip.updatedAt || Date.now());
          setSaveState('saved');
          setActiveDayId(loadedTrip.days[0]?.id ?? '');
        }
      })
      .catch((caught) => { if (active) { setError(friendlyDataError(caught)); setTrip(null); setFamily(null); } });
    return () => { active = false; };
  }, [familyId, tripId, loadKey]);

  const isLeader = Boolean(user && family?.leaders.includes(user.uid));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!authReady || family === undefined || trip === undefined) return;
    if (!isLeader) navigate(`/f/${familyId}/t/${tripId}`, {
      replace: true,
      state: { editNotice: user ? '你不是這個家庭的領隊。' : '請先登入領隊帳號，才能編輯行程。' },
    });
  }, [authReady, family, trip, isLeader, user, navigate, familyId, tripId]);

  const mutate = useCallback((updater: (current: TripDocument) => TripDocument) => {
    if (!tripRef.current) return;
    const next = updater(tripRef.current);
    tripRef.current = next; setTrip(next);
    revisionRef.current += 1; setRevision(revisionRef.current); setSaveState(online ? 'dirty' : 'offline');
  }, [online]);

  const persist = useCallback(async () => {
    if (!user || !tripRef.current || savingRef.current || source === 'local' || !online) return;
    const snapshot = tripRef.current;
    const savingRevision = revisionRef.current;
    const expectedVersion = savedVersionRef.current;
    savingRef.current = true; setSaveState('saving');
    try {
      const nextVersion = await saveTrip(familyId, tripId, snapshot, expectedVersion, user.uid);
      savedVersionRef.current = nextVersion; savedRevisionRef.current = savingRevision;
      setLastSavedAt(Date.now());
      setTrip((current) => {
        if (!current) return current;
        const next = { ...current, version: nextVersion, updatedAt: Date.now(), updatedBy: user.uid };
        tripRef.current = next; return next;
      });
      setSaveState(revisionRef.current === savingRevision ? 'saved' : 'dirty');
    } catch (caught) {
      setSaveState(caught instanceof VersionConflictError ? 'conflict' : 'error');
    } finally {
      savingRef.current = false;
      if (revisionRef.current > savingRevision) setSavePulse((value) => value + 1);
    }
  }, [familyId, tripId, user, source, online]);

  useEffect(() => {
    if (!online) { if (revision > savedRevisionRef.current) setSaveState('offline'); return; }
    if (revision <= savedRevisionRef.current || saveState === 'conflict') return;
    const timer = window.setTimeout(() => void persist(), 1500);
    return () => window.clearTimeout(timer);
  }, [revision, savePulse, online, persist, saveState]);

  const disabled = !online || saveState === 'conflict' || source === 'local';
  const blocks = trip?.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;

  function addBlock(type: BlockType, dayId = activeDayId) {
    if (!dayId || disabled) return;
    let id = '';
    mutate((current) => {
      const dayBlocks = current.blocks
        .filter((block) => block.dayId === dayId)
        .sort((a, b) => a.order - b.order);
      const lastBlock = dayBlocks.at(-1);
      const lastStart = lastBlock ? minutes(lastBlock.time) : null;
      const defaultTime = !lastBlock
        ? '09:00'
        : lastStart !== null && Number.isFinite(lastBlock.durationMin) && lastBlock.durationMin >= 0
          ? shiftedTime(lastBlock.time, lastBlock.durationMin)
          : '';
      const next = createBlock(type, dayId, dayBlocks.length);
      next.time = defaultTime;
      id = next.id;
      return { ...current, blocks: [...current.blocks, next] };
    });
    setActiveDayId(dayId); setSelectedBlockId(id); setLibraryOpen(false);
  }

  function addPreset(preset: FamilyPreset, dayId = activeDayId) {
    if (!dayId || disabled) return;
    let id = '';
    mutate((current) => {
      const dayBlocks = current.blocks.filter((block) => block.dayId === dayId).sort((a, b) => a.order - b.order);
      const lastBlock = dayBlocks.at(-1);
      const lastStart = lastBlock ? minutes(lastBlock.time) : null;
      const time = !lastBlock ? '09:00' : lastStart !== null ? shiftedTime(lastBlock.time, lastBlock.durationMin) : '';
      const { createdAt: _createdAt, createdBy: _createdBy, ...template } = preset;
      const next: Block = { ...template, id: crypto.randomUUID(), dayId, order: dayBlocks.length, time };
      id = next.id;
      return { ...current, blocks: [...current.blocks, next] };
    });
    setActiveDayId(dayId); setSelectedBlockId(id); setLibraryOpen(false);
  }

  function moveBlock(id: string, dayId: string, direction?: -1 | 1) {
    mutate((current) => {
      const target = current.blocks.find((block) => block.id === id);
      if (!target) return current;
      const destinationOrder = target.dayId === dayId
        ? target.order
        : current.blocks.filter((block) => block.dayId === dayId).length;
      let next = current.blocks.map((block) => block.id === id
        ? { ...block, dayId, order: destinationOrder }
        : block);
      next = normalizeOrders(next);
      if (direction && target.dayId === dayId) {
        const dayBlocks = next.filter((block) => block.dayId === dayId).sort((a, b) => a.order - b.order);
        const from = dayBlocks.findIndex((block) => block.id === id);
        const to = Math.max(0, Math.min(dayBlocks.length - 1, from + direction));
        if (from !== to) {
          const [moved] = dayBlocks.splice(from, 1); dayBlocks.splice(to, 0, moved);
          const reordered = new Map(dayBlocks.map((block, order) => [block.id, order]));
          next = next.map((block) => reordered.has(block.id) ? { ...block, order: reordered.get(block.id)! } : block);
        }
      }
      return { ...current, blocks: next };
    });
    setActiveDayId(dayId);
  }

  function duplicateBlock(id: string, dayId: string) {
    mutate((current) => {
      const block = current.blocks.find((item) => item.id === id);
      if (!block) return current;
      const copy = { ...block, id: crypto.randomUUID(), dayId, order: current.blocks.filter((item) => item.dayId === dayId).length };
      return { ...current, blocks: [...current.blocks, copy] };
    });
    setActiveDayId(dayId);
  }

  function deleteBlock(id: string) {
    if (!window.confirm('確定要刪除這張積木嗎？')) return;
    mutate((current) => ({ ...current, blocks: normalizeOrders(current.blocks.filter((block) => block.id !== id)) }));
    setSelectedBlockId(null);
  }

  function copyDay(targetDayId: string) {
    mutate((current) => {
      const existingCount = current.blocks.filter((block) => block.dayId === targetDayId).length;
      const copies = current.blocks.filter((block) => block.dayId === activeDayId).sort((a, b) => a.order - b.order).map((block, index) => ({ ...block, id: crypto.randomUUID(), dayId: targetDayId, order: existingCount + index }));
      return { ...current, blocks: [...current.blocks, ...copies] };
    });
    setActiveDayId(targetDayId);
  }

  function addDay() {
    mutate((current) => {
      const last = current.days.at(-1);
      const dateValue = new Date(`${last?.date ?? current.meta.endDate}T12:00:00`);
      if (last) dateValue.setDate(dateValue.getDate() + 1);
      const date = dateValue.toISOString().slice(0, 10);
      const day: Day = { id: crypto.randomUUID(), date, weekday: weekday(date), theme: '新的一天', highlights: '' };
      setActiveDayId(day.id);
      return { ...current, days: [...current.days, day], meta: { ...current.meta, endDate: date } };
    });
  }

  function deleteDay() {
    if (!window.confirm('確定刪除這一天與當天所有積木嗎？')) return;
    mutate((current) => {
      const days = current.days.filter((day) => day.id !== activeDayId);
      setActiveDayId(days[0]?.id ?? ''); setSelectedBlockId(null);
      return { ...current, days, blocks: current.blocks.filter((block) => block.dayId !== activeDayId), meta: { ...current.meta, endDate: days.at(-1)?.date ?? current.meta.startDate } };
    });
  }

  function updateSelected(patch: Partial<Block>) {
    if (!selectedBlockId || disabled) return;
    mutate((current) => ({ ...current, blocks: current.blocks.map((block) => block.id === selectedBlockId ? { ...block, ...patch } : block) }));
  }

  function changeTime(time: string) {
    if (!selectedBlock) return;
    const before = minutes(selectedBlock.time); const after = minutes(time);
    const shouldShift = before !== null && after !== null && before !== after && window.confirm('要將這張卡之後的積木一起順延嗎？');
    mutate((current) => ({ ...current, blocks: current.blocks.map((block) => {
      if (block.id === selectedBlock.id) return { ...block, time };
      if (shouldShift && block.dayId === selectedBlock.dayId && block.order > selectedBlock.order) return { ...block, time: shiftedTime(block.time, after! - before!) };
      return block;
    }) }));
  }

  function applyMembers(members: TripMember[]) {
    if (!trip || disabled) return;
    const removed = trip.members.filter((member) => !members.some((next) => next.id === member.id)).map((member) => member.id);
    const affected = trip.blocks.filter((block) => (block.assignees ?? []).some((id) => removed.includes(id))).length;
    if (affected && !window.confirm(`移除的成員仍負責 ${affected} 張積木。套用後會從這些積木一併移除，確定繼續？`)) return;
    mutate((current) => ({ ...current, members, blocks: current.blocks.map((block) => {
      const next: Block = {
        ...block,
        assignees: (block.assignees ?? []).filter((id) => !removed.includes(id)),
      };
      if (block.responsibleMemberIds) {
        next.responsibleMemberIds = block.responsibleMemberIds.filter((id) => !removed.includes(id));
      }
      if (block.groups) {
        next.groups = block.groups.map((group) => ({
          ...group,
          memberIds: group.memberIds.filter((id) => !removed.includes(id)),
        }));
      }
      return next;
    }) }));
    setMembersOpen(false);
  }

  function importDay(_day: Day, importedBlocks: Block[]) {
    if (disabled) return;
    mutate((current) => {
      const start = current.blocks.filter((block) => block.dayId === activeDayId).length;
      const copies = importedBlocks.sort((a, b) => a.order - b.order).map((block, index) => ({ ...block, id: crypto.randomUUID(), dayId: activeDayId, order: start + index }));
      return { ...current, blocks: [...current.blocks, ...copies] };
    });
    setImportOpen(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || disabled) return;
    const activeKind = active.data.current?.kind as string | undefined;
    const overKind = over.data.current?.kind as string | undefined;
    const targetDayId = over.data.current?.dayId as string | undefined;
    if (activeKind === 'library') { addBlock(active.data.current?.type as BlockType, targetDayId ?? activeDayId); return; }
    if (activeKind !== 'block') return;
    const activeId = active.data.current?.blockId as string;
    if (overKind === 'block') {
      const overId = over.data.current?.blockId as string;
      mutate((current) => {
        const moving = current.blocks.find((block) => block.id === activeId);
        const target = current.blocks.find((block) => block.id === overId);
        if (!moving || !target) return current;
        let next = normalizeOrders(current.blocks.map((block) => block.id === activeId ? { ...block, dayId: target.dayId } : block));
        const list = next.filter((block) => block.dayId === target.dayId).sort((a, b) => a.order - b.order);
        const from = list.findIndex((block) => block.id === activeId); const to = list.findIndex((block) => block.id === overId);
        const [item] = list.splice(from, 1); list.splice(to, 0, item);
        const orders = new Map(list.map((block, order) => [block.id, order]));
        next = next.map((block) => orders.has(block.id) ? { ...block, order: orders.get(block.id)! } : block);
        return { ...current, blocks: next };
      });
      if (targetDayId) setActiveDayId(targetDayId); return;
    }
    if (targetDayId) moveBlock(activeId, targetDayId);
  }

  const statusLabel = useMemo(() => {
    if (saveState === 'saving') return '儲存中…';
    if (saveState === 'error') return '儲存失敗（重試）';
    if (saveState === 'conflict') return '有人剛改過這份行程，請重新載入';
    if (!online || saveState === 'offline') return '目前離線，已暫停編輯';
    if (saveState === 'dirty') return '等待儲存…';
    const seconds = Math.max(0, Math.floor((now - lastSavedAt) / 1000));
    return `已儲存 · ${seconds < 60 ? '剛剛' : `${Math.floor(seconds / 60)} 分鐘前`}`;
  }, [saveState, online, lastSavedAt, now]);

  if (trip === undefined || family === undefined || !authReady) return <main className="page"><p className="loading">正在載入編輯器…</p></main>;
  if (!trip || !family) return <main className="page page-narrow"><h1>載入失敗</h1><p className="error-state">{error || '找不到行程。'}</p><button className="primary-button" type="button" onClick={() => setLoadKey((key) => key + 1)}>重試</button></main>;
  if (!isLeader) return <main className="page"><p className="loading">正在返回唯讀行程…</p></main>;

  return (
    <main className="editor-page">
      {source === 'local' && <div className="dev-banner" role="alert">開發模式：正在使用本機遷移資料，不是線上資料；編輯已停用</div>}
      <div className="save-bar" data-state={saveState}><span>{statusLabel}</span>{(saveState === 'error') && <button type="button" onClick={() => void persist()}>重試</button>}{saveState === 'conflict' && <button type="button" onClick={() => setLoadKey((key) => key + 1)}>重新載入</button>}</div>
      {!online && <div className="offline-banner" role="alert">網路中斷，恢復連線前不能修改行程，避免改動遺失。</div>}
      <header className="editor-topbar"><div><Link className="back-link" to={`/f/${familyId}/t/${tripId}`}><ArrowLeft size={16} aria-hidden />返回唯讀行程</Link><h1>{trip.meta.title}</h1></div><div className="editor-actions"><Link className="secondary-button" to={`/f/${familyId}/t/${tripId}/guide`}><BookOpen aria-hidden />指南＆必買</Link><button className="secondary-button" disabled={disabled} type="button" onClick={() => setMembersOpen(true)}><Users aria-hidden />成員設定</button><button className="mobile-library-button" disabled={disabled} type="button" onClick={() => setLibraryOpen(true)}><Boxes aria-hidden />積木庫</button></div></header>
      {toast && <div className="toast" role="status" onAnimationEnd={() => setToast('')}>{toast}</div>}
      <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="editor-layout">
          <aside className={`library-panel ${libraryOpen ? 'is-open' : ''}`}><button className="sheet-close library-close" type="button" onClick={() => setLibraryOpen(false)}>關閉</button><BlockLibrary disabled={disabled} presets={presets} onAdd={addBlock} onAddPreset={addPreset} onRenamePreset={(preset) => { const title = window.prompt('範本新名稱', preset.title)?.trim(); if (title) void renameFamilyPreset(familyId, preset.id, title).then(() => setPresets((items) => items.map((item) => item.id === preset.id ? { ...item, title } : item))).catch(() => setToast('範本改名失敗')); }} onDeletePreset={(preset) => { if (window.confirm(`確定刪除範本「${preset.title}」？`)) void deleteFamilyPreset(familyId, preset.id).then(() => setPresets((items) => items.filter((item) => item.id !== preset.id))).catch(() => setToast('範本刪除失敗')); }} /></aside>
          <EditorCanvas activeDayId={activeDayId} blocks={trip.blocks} days={trip.days} members={trip.members} disabled={disabled} selectedBlockId={selectedBlockId} onActiveDay={setActiveDayId} onAddDay={addDay} onCopyDay={copyDay} onDelete={deleteBlock} onDeleteDay={deleteDay} onDuplicate={duplicateBlock} onImportDay={() => setImportOpen(true)} onMove={moveBlock} onSavePreset={(id) => { const block = trip.blocks.find((item) => item.id === id); if (block) void saveFamilyPreset(familyId, block, user!.uid).then(() => getFamilyPresets(familyId)).then((items) => { setPresets(items); setToast('已另存為家庭範本'); }).catch(() => setToast('範本儲存失敗')); }} onSelect={(id) => setSelectedBlockId(id)} />
          <div className={`property-panel-wrap ${selectedBlock ? 'is-open' : ''}`}><PropertyPanel block={selectedBlock} disabled={disabled} members={trip.members} onClose={() => setSelectedBlockId(null)} onTimeChange={changeTime} onUpdate={updateSelected} /></div>
        </div>
      </DndContext>
      {libraryOpen && <button className="sheet-scrim" type="button" aria-label="關閉積木庫" onClick={() => setLibraryOpen(false)} />}
      {selectedBlock && <button className="property-scrim" type="button" aria-label="關閉屬性面板" onClick={() => setSelectedBlockId(null)} />}
      <MembersDialog disabled={disabled} familyMembers={family.members} open={membersOpen} tripMembers={trip.members} onClose={() => setMembersOpen(false)} onSave={applyMembers} />
      <ImportDayDialog currentTripId={tripId} disabled={disabled} familyId={familyId} open={importOpen} onClose={() => setImportOpen(false)} onImport={importDay} />
    </main>
  );
}
