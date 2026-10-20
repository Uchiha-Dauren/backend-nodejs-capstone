import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiRequest, saveSession } from '../../api';
import { useAppContext } from '../../context/AppContext';
export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const { isLoggedIn, setIsLoggedIn, setUserName } = useAppContext();
  const navigate = useNavigate();
  if (isLoggedIn) return <Navigate to="/app" replace />;
  const update = event => setForm({ ...form, [event.target.name]: event.target.value });
  async function register(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await apiRequest('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!data.authtoken) throw new Error('Registration could not be completed.');
      saveSession(data); setUserName(data.userName || form.firstName); setIsLoggedIn(true); navigate('/app');
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="container py-5"><form className="card auth-card p-4 p-md-5 mx-auto" onSubmit={register}>
    <p className="eyebrow">JOIN THE COMMUNITY</p><h1 className="h2 mb-4">Create an account</h1>
    <label className="form-label" htmlFor="firstName">First name</label><input id="firstName" name="firstName" autoComplete="given-name" className="form-control mb-3" required maxLength="80" value={form.firstName} onChange={update} />
    <label className="form-label" htmlFor="lastName">Last name</label><input id="lastName" name="lastName" autoComplete="family-name" className="form-control mb-3" required maxLength="80" value={form.lastName} onChange={update} />
    <label className="form-label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" className="form-control mb-3" required value={form.email} onChange={update} />
    <label className="form-label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" className="form-control mb-2" required minLength="8" maxLength="72" value={form.password} onChange={update} /><p className="small text-secondary mb-4">Use at least 8 characters.</p>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button><p className="mt-4 mb-0">Already a member? <Link to="/app/login">Login</Link></p>
  </form></main>;
}
