import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const families = [
  { id: 'sunlau', name: 'Sun & Lau Family', shortName: 'SLFT' },
  { id: 'mok', name: 'Mok Family', shortName: 'MokFT' },
];

export function Home() {
  return (
    <main className="page page-narrow">
      <p className="eyebrow">Songsong</p>
      <h1>爽爽</h1>
      <p className="lede">家庭旅行的行程入口。</p>
      <nav className="link-list" aria-label="家庭清單">
        {families.map((family) => (
          <Link className="link-row" to={`/f/${family.id}`} key={family.id}>
            <span>
              <span className="row-title">{family.name}</span>
              <span className="row-meta trip-code">{family.shortName}</span>
            </span>
            <ArrowUpRight className="row-arrow" aria-hidden />
          </Link>
        ))}
      </nav>
    </main>
  );
}
