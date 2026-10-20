import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api';
import { imageUrl } from '../../config';
import { useAppContext } from '../../context/AppContext';
export default function MainPage() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const { isLoggedIn } = useAppContext();
  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/api/secondchance/items', { signal: controller.signal }).then(setItems)
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <main className="container py-5">
    <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
      <div><p className="eyebrow">GOOD THINGS DESERVE ANOTHER CHANCE</p><h1>Find your next favorite</h1><p className="text-secondary">Discover useful items, share what you no longer need, and keep good things in use.</p></div>
      {isLoggedIn && <Link to="/app/addItem" className="btn btn-primary flex-shrink-0">Add Item</Link>}
    </div>
    {loading && <p role="status">Loading items…</p>}
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {!loading && !error && items.length === 0 && <p>No items yet. Be the first to share one.</p>}
    <div className="row g-4">{items.map(item => <div key={item.id} className="col-sm-6 col-lg-4 col-xl-3">
      <article className="card product-card h-100">
        <div className="image-placeholder">{item.image ? <img src={imageUrl(item.image)} alt={item.name} loading="lazy" /> : <div className="no-image-available">No image available</div>}</div>
        <div className="card-body"><span className="item-condition">{item.condition}</span><h2 className="h5 mt-2">{item.name}</h2><p className="small text-secondary">{item.category}</p><Link to={`/app/item/${item.id}`} className="btn btn-outline-primary mt-auto">View Details</Link></div>
      </article>
    </div>)}</div>
  </main>;
}
