import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api';
import { imageUrl } from '../../config';
export default function SearchPage() {
  const [query, setQuery] = useState(''), [category, setCategory] = useState(''), [condition, setCondition] = useState(''), [age, setAge] = useState(10);
  const [results, setResults] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/api/secondchance/items', { signal: controller.signal }).then(setResults)
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function search(event) {
    event.preventDefault(); setLoading(true); setError('');
    const params = new URLSearchParams({ name: query, category, condition, age_years: age });
    try { setResults(await apiRequest(`/api/secondchance/search?${params}`)); }
    catch (error) { setError(error.message); } finally { setLoading(false); }
  }
  return <main className="container py-5"><p className="eyebrow">DISCOVER SOMETHING USEFUL</p><h1>Search items</h1>
    <form onSubmit={search} className="card p-4 my-4"><div className="row g-3 align-items-end">
      <div className="col-md-4"><label htmlFor="search-query" className="form-label">Item name</label><input id="search-query" className="form-control" value={query} onChange={e => setQuery(e.target.value)} placeholder="Try sofa or table" /></div>
      <div className="col-md-2"><label htmlFor="categorySelect" className="form-label">Category</label><select id="categorySelect" className="form-select" value={category} onChange={e => setCategory(e.target.value)}><option value="">All</option>{['Living', 'Bedroom', 'Bathroom', 'Kitchen', 'Office'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div className="col-md-2"><label htmlFor="conditionSelect" className="form-label">Condition</label><select id="conditionSelect" className="form-select" value={condition} onChange={e => setCondition(e.target.value)}><option value="">All</option>{['New', 'Like New', 'Older'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div className="col-md-2"><label htmlFor="ageRange" className="form-label">Up to {age} years old</label><input type="range" id="ageRange" className="form-range" min="1" max="20" value={age} onChange={e => setAge(e.target.value)} /></div>
      <div className="col-md-2"><button className="btn btn-primary w-100" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button></div>
    </div></form>
    {error && <p className="alert alert-danger" role="alert">{error}</p>}
    <p role="status" className="text-secondary">{loading ? 'Loading items…' : `${results.length} items found`}</p>
    {!loading && !results.length && <p>No items match these filters. Try a broader search.</p>}
    <div className="row g-4">{results.map(item => <div key={item.id} className="col-sm-6 col-lg-4"><article className="card product-card h-100">
      <div className="image-placeholder">{item.image ? <img src={imageUrl(item.image)} alt={item.name} loading="lazy" /> : <div className="no-image-available">No image available</div>}</div>
      <div className="card-body"><span className="item-condition">{item.condition}</span><h2 className="h5 mt-2">{item.name}</h2><p>{(item.description || '').slice(0, 130)}</p><Link to={`/app/item/${item.id}`} className="btn btn-outline-primary mt-auto">View Details</Link></div>
    </article></div>)}</div>
  </main>;
}
