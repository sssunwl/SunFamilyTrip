import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DayList } from '../components/DayList';
import { MemberList } from '../components/MemberList';
import { TripHeader } from '../components/TripHeader';
import { TripMeta } from '../components/TripMeta';
import { getTrip } from '../lib/db';
import type { TripDocument } from '../types/legacy';

function localIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function Trip() {
  const { family = '', trip: tripId = '' } = useParams();
  const [trip, setTrip] = useState<TripDocument | null>();

  useEffect(() => {
    let active = true;
    getTrip(family, tripId).then((nextTrip) => {
      if (active) setTrip(nextTrip);
    });
    return () => { active = false; };
  }, [family, tripId]);

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
      <TripHeader trip={trip} />
      <div className="trip-body">
        <Link className="back-link" to={`/f/${family}`}><ArrowLeft size={16} aria-hidden />返回家庭行程</Link>
        <section className="member-section" aria-labelledby="travelers-heading">
          <h2 id="travelers-heading">同行成員</h2>
          <MemberList members={trip.members} />
        </section>
        <DayList days={trip.days} blocks={trip.blocks} initialDayId={todayDayId} />
        <TripMeta trip={trip} />
      </div>
    </main>
  );
}
