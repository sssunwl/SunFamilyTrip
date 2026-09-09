import { ArrowLeft } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { DayList } from '../components/DayList';
import { MemberList } from '../components/MemberList';
import { TripHeader } from '../components/TripHeader';
import { TripMeta } from '../components/TripMeta';
import { friendlyDataError, getFamily, getTrip, type DataSource } from '../lib/db';
import type { TripDocument } from '../types/legacy';

function localIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function Trip({ user, authReady }: { user: User | null; authReady: boolean }) {
  const { family = '', trip: tripId = '' } = useParams();
  const location = useLocation();
  const [trip, setTrip] = useState<TripDocument | null>();
  const [isLeader, setIsLeader] = useState(false);
  const [source, setSource] = useState<DataSource>('firestore');
  const [error, setError] = useState('');
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setTrip(undefined);
    setError('');
    Promise.all([getTrip(family, tripId), getFamily(family)])
      .then(([nextTrip, nextFamily]) => {
        if (!active) return;
        setTrip(nextTrip.data);
        setSource(nextTrip.source === 'local' || nextFamily.source === 'local' ? 'local' : 'firestore');
        setIsLeader(Boolean(user && nextFamily.data?.leaders.includes(user.uid)));
      })
      .catch((caught) => {
        if (!active) return;
        setError(friendlyDataError(caught));
        setTrip(null);
      });
    return () => { active = false; };
  }, [family, tripId, user, loadKey]);

  const todayDayId = useMemo(() => {
    if (!trip) return undefined;
    const today = localIsoDate();
    if (today < trip.meta.startDate || today > trip.meta.endDate) return undefined;
    return trip.days.find((day) => day.date === today)?.id;
  }, [trip]);

  useEffect(() => {
    if (!todayDayId) return;
    requestAnimationFrame(() => document.getElementById(todayDayId)?.scrollIntoView({ block: 'start' }));
  }, [todayDayId]);

  if (trip === undefined) return <main className="page"><p className="loading">正在載入行程…</p></main>;
  if (trip === null) {
    if (error) return <main className="page page-narrow"><h1>載入失敗</h1><p className="error-state">{error}</p><button className="primary-button" type="button" onClick={() => setLoadKey((key) => key + 1)}>重試</button></main>;
    return (
      <main className="page page-narrow">
        <Link className="back-link" to={`/f/${family}`}><ArrowLeft size={16} aria-hidden />返回家庭</Link>
        <h1>找不到這趟行程</h1>
        <p className="error-state">請檢查行程連結是否正確。</p>
      </main>
    );
  }

  return (
    <main>
      {source === 'local' && <div className="dev-banner" role="status">開發模式：正在使用本機遷移資料，不是線上資料</div>}
      <TripHeader trip={trip} />
      <div className="trip-body">
        <Link className="back-link" to={`/f/${family}`}><ArrowLeft size={16} aria-hidden />返回家庭行程</Link>
        {(location.state as { editNotice?: string } | null)?.editNotice && (
          <p className="notice-banner" role="alert">{(location.state as { editNotice: string }).editNotice}</p>
        )}
        <div className="trip-actions">
          <Link className="secondary-button" to={`/f/${family}/t/${tripId}/guide`}>指南＆必買</Link>
          {authReady && isLeader && <Link className="primary-link" to={`/f/${family}/t/${tripId}/edit`}>編輯行程</Link>}
        </div>
        {authReady && user && !isLeader && <p className="permission-note">你不是這個家庭的領隊。</p>}
        <section className="member-section" aria-labelledby="travelers-heading">
          <h2 id="travelers-heading">同行成員</h2>
          <MemberList members={trip.members} />
        </section>
        <DayList trip={trip} initialDayId={todayDayId} />
        <TripMeta trip={trip} />
      </div>
    </main>
  );
}
