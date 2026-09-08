import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { observeCurrentUser, signOut } from './lib/auth';
import { Family } from './routes/Family';
import { Home } from './routes/Home';
import { Login } from './routes/Login';
import { Trip } from './routes/Trip';

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => observeCurrentUser(setUser), []);

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
        <Route path="/f/:family" element={<Family />} />
        <Route path="/f/:family/t/:trip" element={<Trip />} />
        <Route path="*" element={<main className="page page-narrow"><h1>找不到這一頁</h1></main>} />
      </Routes>
    </div>
  );
}
