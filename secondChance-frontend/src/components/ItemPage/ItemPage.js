import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api';
import { useAppContext } from '../../context/AppContext';
export default function ItemPage() {
  const { isLoggedIn } = useAppContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', category: 'Living', condition: 'New', zipcode: '', age_days: 0, description: '' });
  const [file, setFile] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (!isLoggedIn) return <Navigate to="/app/login" replace />;
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function add(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.append('age_years', (Number(form.age_days) / 365).toFixed(2));
      if (file) body.append('file', file);
      const item = await apiRequest('/api/secondchance/items', { method: 'POST', body });
      navigate(item.id ? `/app/item/${item.id}` : '/app');
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <main className="container py-5"><form className="card auth-card p-4 p-md-5 mx-auto" onSubmit={add}><p className="eyebrow">GIVE SOMETHING A NEW HOME</p><h1 className="h2 mb-4">Add Item</h1>
    <label className="form-label" htmlFor="name">Item name</label><input className="form-control mb-3" id="name" name="name" required maxLength="150" value={form.name} onChange={update} />
    <label className="form-label" htmlFor="category">Category</label><select className="form-select mb-3" id="category" name="category" value={form.category} onChange={update}>{['Living', 'Bedroom', 'Bathroom', 'Kitchen', 'Office'].map(value => <option key={value}>{value}</option>)}</select>
    <label className="form-label" htmlFor="condition">Condition</label><select className="form-select mb-3" id="condition" name="condition" value={form.condition} onChange={update}>{['New', 'Like New', 'Older'].map(value => <option key={value}>{value}</option>)}</select>
    <label className="form-label" htmlFor="zipcode">ZIP / postal code</label><input className="form-control mb-3" id="zipcode" name="zipcode" maxLength="20" required value={form.zipcode} onChange={update} />
    <label className="form-label" htmlFor="age_days">Age in days</label><input className="form-control mb-3" type="number" min="0" max="36500" id="age_days" name="age_days" required value={form.age_days} onChange={update} />
    <label className="form-label" htmlFor="description">Description</label><textarea className="form-control mb-3" id="description" name="description" required maxLength="5000" rows="4" value={form.description} onChange={update} />
    <label className="form-label" htmlFor="file">Photo (optional, up to 5 MB)</label><input className="form-control mb-4" type="file" accept="image/jpeg,image/png,image/gif,image/webp" id="file" onChange={e => { const selected = e.target.files[0]; if (selected?.size > 5 * 1024 * 1024) { e.target.value = ''; setFile(null); setError('Please choose an image smaller than 5 MB.'); } else { setFile(selected || null); setError(''); } }} />
    {error && <p role="alert" className="alert alert-danger">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Adding item…' : 'Add Item'}</button>
  </form></main>;
}
