import { lazy, Suspense, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { observeCurrentUser, signOut } from './lib/auth';
import { Family } from './routes/Family';
import { Guide } from './routes/Guide';
import { Home } from './routes/Home';
import { Login } from './routes/Login';
import { Trip } from './routes/Trip';

const TripEditor = lazy(() => import('./routes/TripEditor').then((module) => ({ default: module.TripEditor })));

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => observeCurrentUser((nextUser) => {
    setUser(nextUser);
    setAuthReady(true);
  }), []);

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">爽爽 <span>Songsong</span></Link>
        <div className="header-actions">
          {user ? (
            <button className="text-button" type="button" onClick={() => void signOut()}>登出</button>
          ) : (
            <Link className="text-link" to="/login" state={{ from: location.pathname }}>領隊登入</Link>
          )}
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/f/:family" element={<Family user={user} authReady={authReady} />} />
        <Route path="/f/:family/t/:trip" element={<Trip user={user} authReady={authReady} />} />
        <Route path="/f/:family/t/:trip/guide" element={<Guide user={user} authReady={authReady} />} />
        <Route path="/f/:family/t/:trip/edit" element={<Suspense fallback={<main className="page"><p className="loading">正在載入編輯器…</p></main>}><TripEditor user={user} authReady={authReady} /></Suspense>} />
        <Route path="*" element={<main className="page page-narrow"><h1>找不到這一頁</h1></main>} />
      </Routes>
    </div>
  );
}
