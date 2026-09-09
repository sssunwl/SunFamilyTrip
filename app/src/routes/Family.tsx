import type { User } from 'firebase/auth';
import { ArrowLeft, ArrowUpRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CreateTripDialog } from '../components/CreateTripDialog';
import { MemberList } from '../components/MemberList';
import { friendlyDataError, getFamily, getFamilyTrips, type DataSource } from '../lib/db';
import type { Family as FamilyData } from '../types/trip';
import type { TripSummary } from '../types/legacy';

const statusGroups = [
  { status: 'upcoming', label: '即將出發' },
  { status: 'live', label: '進行中' },
  { status: 'past', label: '回憶錄' },
] as const;

export function Family({ user, authReady }: { user: User | null; authReady: boolean }) {
  const { family: familyId = '' } = useParams();
  const navigate = useNavigate();
  const [family, setFamily] = useState<FamilyData | null>();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [source, setSource] = useState<DataSource>('firestore');
  const [error, setError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setFamily(undefined);
    setError('');
    Promise.all([getFamily(familyId), getFamilyTrips(familyId)])
      .then(([nextFamily, nextTrips]) => {
        if (!active) return;
        setFamily(nextFamily.data);
        setTrips(nextTrips.data.sort((a, b) => b.meta.startDate.localeCompare(a.meta.startDate)));
        setSource(nextFamily.source === 'local' || nextTrips.source === 'local' ? 'local' : 'firestore');
      })
      .catch((caught) => {
        if (!active) return;
        setError(friendlyDataError(caught));
        setFamily(null);
      });
    return () => { active = false; };
  }, [familyId, loadKey]);

  if (family === undefined) return <main className="page"><p className="loading">正在載入家庭資料…</p></main>;
  if (family === null) {
    if (error) return <main className="page page-narrow"><h1>載入失敗</h1><p className="error-state">{error}</p><button className="primary-button" type="button" onClick={() => setLoadKey((key) => key + 1)}>重試</button></main>;
    return (
      <main className="page page-narrow">
        <Link className="back-link" to="/"><ArrowLeft size={16} aria-hidden />返回首頁</Link>
        <h1>找不到這個家庭</h1>
        <p className="error-state">請檢查家庭連結是否正確。</p>
      </main>
    );
  }

  return (
    <main className="page">
      {source === 'local' && <div className="dev-banner" role="status">開發模式：正在使用本機遷移資料，不是線上資料</div>}
      <Link className="back-link" to="/"><ArrowLeft size={16} aria-hidden />全部家庭</Link>
      <p className="eyebrow trip-code">{family.shortName}</p>
      <div className="family-title-row"><h1>{family.name}</h1>{authReady && user && family.leaders.includes(user.uid) && source === 'firestore' && <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus aria-hidden />開新行程</button>}</div>

      <section className="member-section" aria-labelledby="members-heading">
        <h2 id="members-heading">家庭成員</h2>
        <MemberList members={family.members} />
      </section>

      <section className="trip-section" aria-labelledby="trips-heading">
        <h2 id="trips-heading">行程</h2>
        {statusGroups.map((group) => {
          const groupedTrips = trips.filter((trip) => trip.meta.status === group.status);
          return (
            <div className="status-group" key={group.status}>
              <p className="status-heading"><span className="status-dot" />{group.label}</p>
              {groupedTrips.length === 0 ? (
                <p className="empty-row">目前沒有行程。</p>
              ) : (
                <div className="trip-list">
                  {groupedTrips.map((trip) => (
                    <Link className="trip-row" to={`/f/${familyId}/t/${trip.id}`} key={trip.id}>
                      <span>
                        <span className="row-title">{trip.meta.title}</span>
                        <span className="row-meta mono">{trip.meta.startDate} → {trip.meta.endDate}</span>
                      </span>
                      <ArrowUpRight className="row-arrow" aria-hidden />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
      {createOpen && user && <CreateTripDialog family={family} trips={trips} uid={user.uid} onClose={() => setCreateOpen(false)} onCreated={(tripId) => navigate(`/f/${familyId}/t/${tripId}/edit`)} />}
    </main>
  );
}
