import type { FormEvent } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../lib/auth';

function friendlyAuthError(code?: string) {
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return '家庭代號或密碼不正確，請再試一次。';
  }
  if (code === 'auth/too-many-requests') return '嘗試次數太多，請稍後再試。';
  if (code === 'auth/network-request-failed') return '網路連線失敗，請檢查連線後再試。';
  return '暫時無法登入，請稍後再試。';
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(code, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (caught) {
      const authError = caught as { code?: string };
      setError(friendlyAuthError(authError.code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page page-narrow">
      <p className="eyebrow">Leader access</p>
      <h1>領隊登入</h1>
      <p className="lede">使用家庭代號與密碼登入。</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="family-code">家庭代號</label>
          <input
            id="family-code"
            name="family-code"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">密碼</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? '登入中…' : '登入'}
        </button>
      </form>
    </main>
  );
}
