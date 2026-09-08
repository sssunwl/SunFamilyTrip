import { ExternalLink } from 'lucide-react';
import type { TripDocument } from '../types/legacy';

export function TripHeader({ trip }: { trip: TripDocument }) {
  return (
    <header className="trip-hero">
      <div className="trip-hero-copy">
        <p className="eyebrow">{trip.meta.country} · {trip.meta.city}</p>
        <h1>{trip.meta.title}</h1>
        <p className="trip-subtitle">{trip.meta.subtitle}</p>
        <time className="trip-dates" dateTime={trip.meta.startDate}>
          {trip.meta.startDate} → {trip.meta.endDate}
        </time>
        {trip.meta.photosUrl && (
          <a className="text-link" href={trip.meta.photosUrl} target="_blank" rel="noreferrer">
            家庭相簿 <ExternalLink size={14} aria-hidden />
          </a>
        )}
      </div>
      {trip.meta.heroImg && (
        <div className="trip-hero-media">
          <img src={trip.meta.heroImg} alt={`${trip.meta.city}行程封面`} />
        </div>
      )}
    </header>
  );
}
