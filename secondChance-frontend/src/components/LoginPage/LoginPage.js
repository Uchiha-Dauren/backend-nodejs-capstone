import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiRequest, saveSession } from '../../api';
import { useAppContext } from '../../context/AppContext';
export default function LoginPage() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const { isLoggedIn, setIsLoggedIn, setUserName } = useAppContext();
  const navigate = useNavigate();
  if (isLoggedIn) return <Navigate to="/app" replace />;
  async function login(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const data = await apiRequest('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!data.authtoken) throw new Error('Login could not be completed.');
      saveSession(data); setUserName(data.userName); setIsLoggedIn(true); navigate('/app');
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="container py-5"><form className="card auth-card p-4 p-md-5 mx-auto" onSubmit={login}>
    <p className="eyebrow">WELCOME BACK</p><h1 className="h2 mb-4">Login</h1>
    <label htmlFor="email" className="form-label">Email</label><input id="email" type="email" className="form-control mb-3" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
    <label htmlFor="password" className="form-label">Password</label><input id="password" type="password" className="form-control mb-4" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button><p className="mt-4 mb-0">New here? <Link to="/app/register">Create an account</Link></p>
  </form></main>;
}
