import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiRequest } from '../../api';
import { useAppContext } from '../../context/AppContext';
export default function Profile() {
  const { isLoggedIn, setUserName, setIsLoggedIn } = useAppContext();
  const [profile, setProfile] = useState(null), [name, setName] = useState(''), [editing, setEditing] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isLoggedIn) return;
    const controller = new AbortController();
    apiRequest('/api/auth/profile', { signal: controller.signal }).then(data => { setProfile(data); setName(data.name || data.firstName || ''); })
      .catch(error => {
        if (error.name === 'AbortError') return;
        if (error.status === 401) { sessionStorage.removeItem('auth-token'); setIsLoggedIn(false); }
        else setError(error.message);
      });
    return () => controller.abort();
  }, [isLoggedIn, setIsLoggedIn]);
  if (!isLoggedIn) return <Navigate to="/app/login" replace />;
  async function save(event) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      await apiRequest('/api/auth/update', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
      setProfile({ ...profile, name: name.trim() }); setUserName(name.trim()); sessionStorage.setItem('name', name.trim());
      setEditing(false); setMessage('Your profile was updated successfully.');
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="container py-5"><section className="card auth-card p-4 p-md-5 mx-auto"><p className="eyebrow">YOUR ACCOUNT</p><h1 className="h2 mb-4">Profile</h1>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}{message && <p className="alert alert-success" role="status">{message}</p>}
    {!profile && !error && <p role="status">Loading profile…</p>}
    {profile && (editing ? <form onSubmit={save}><label className="form-label" htmlFor="profile-email">Email</label><input id="profile-email" className="form-control mb-3" value={profile.email} disabled /><label className="form-label" htmlFor="profile-name">Name</label><input id="profile-name" className="form-control mb-4" required maxLength="160" value={name} onChange={e => setName(e.target.value)} /><div className="d-flex gap-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="btn btn-outline-secondary" onClick={() => setEditing(false)}>Cancel</button></div></form> : <><h2 className="h4">Hi, {profile.name || profile.firstName}</h2><p>{profile.email}</p><button className="btn btn-primary" onClick={() => { setEditing(true); setMessage(''); }}>Edit profile</button></>)}
  </section></main>;
}
