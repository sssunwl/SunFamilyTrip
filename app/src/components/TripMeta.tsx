import type { LegacyRecord, TripDocument } from '../types/legacy';

const labels: Record<string, string> = {
  group: '成員',
  from: '出發地',
  note: '備註',
  flightOut: '去程航班',
  timeOut: '去程時間',
  flightBack: '回程航班',
  timeBack: '回程時間',
  name: '住宿',
  address: '地址',
  koreanAddress: '當地地址',
  directions: '前往方式',
  link: '住宿連結',
  mapUrl: '地圖',
  checkIn: '入住',
  checkOut: '退房',
  notes: '住宿備註',
};

function displayValue(value: unknown) {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return <a href={value} target="_blank" rel="noreferrer">開啟連結</a>;
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const captions = value
      .filter((item): item is LegacyRecord => Boolean(item) && typeof item === 'object')
      .map((item) => item.caption)
      .filter((caption): caption is string => typeof caption === 'string');
    return captions.length ? captions.join('、') : null;
  }
  return null;
}

function RecordList({ record }: { record: LegacyRecord }) {
  return (
    <dl className="meta-list">
      {Object.entries(record).map(([key, value]) => {
        const displayed = displayValue(value);
        if (!displayed) return null;
        return (
          <div className="meta-row" key={key}>
            <dt className="meta-label">{labels[key] ?? key}</dt>
            <dd className="meta-value">{displayed}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function TripMeta({ trip }: { trip: TripDocument }) {
  const hasDetails = trip.meta.flights?.length || trip.meta.accommodation || trip.meta.emergency.length;
  if (!hasDetails) return null;

  return (
    <section className="meta-section" aria-labelledby="trip-info-heading">
      <p className="eyebrow">Trip notes</p>
      <h2 id="trip-info-heading">航班、住宿與緊急資料</h2>
      <div className="meta-grid">
        {trip.meta.flights && trip.meta.flights.length > 0 && (
          <div>
            <h3>航班</h3>
            {trip.meta.flights.map((flight, index) => (
              <RecordList record={flight} key={String(flight.group ?? index)} />
            ))}
          </div>
        )}
        {trip.meta.accommodation && (
          <div>
            <h3>住宿</h3>
            <RecordList record={trip.meta.accommodation} />
          </div>
        )}
        <div>
          <h3>緊急電話</h3>
          <ul className="meta-list">
            {trip.meta.emergency.map((item) => (
              <li className="meta-row" key={`${item.label}-${item.phone}`}>
                <span className="meta-label">{item.label}</span>
                <a className="meta-value mono" href={`tel:${item.phone}`}>{item.phone}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
