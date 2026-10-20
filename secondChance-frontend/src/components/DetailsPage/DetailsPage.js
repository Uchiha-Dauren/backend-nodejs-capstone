import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../api';
import { imageUrl } from '../../config';
import './DetailsPage.css';
export default function DetailsPage() {
  const { itemId } = useParams();
  const [gift, setGift] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    apiRequest(`/api/secondchance/items/${encodeURIComponent(itemId)}`, { signal: controller.signal }).then(setGift)
      .catch(error => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    window.scrollTo(0, 0); return () => controller.abort();
  }, [itemId]);
  return <main className="container py-5">
    <Link className="btn btn-outline-secondary mb-4" to="/app">← All items</Link>
    {loading ? <p role="status">Loading item…</p> : error ? <p className="alert alert-danger" role="alert">{error}</p> : gift && <>
      <article className="card product-details-card p-3 p-md-4"><div className="row g-4">
        <div className="col-md-6"><div className="image-placeholder-large">{gift.image ? <img src={imageUrl(gift.image)} alt={gift.name} className="product-image-large" /> : <div className="no-image-available-large">No image available</div>}</div></div>
        <div className="col-md-6"><p className="eyebrow">{gift.category}</p><h1>{gift.name}</h1><p className="item-condition">{gift.condition}</p><p className="lead">{gift.description}</p>
          <dl className="row"><dt className="col-5">Age</dt><dd className="col-7">{gift.age_years} years</dd><dt className="col-5">ZIP code</dt><dd className="col-7">{gift.zipcode || 'Not provided'}</dd><dt className="col-5">Added</dt><dd className="col-7">{gift.date_added ? new Date(Number(gift.date_added) * 1000).toLocaleDateString() : 'Recently'}</dd></dl>
        </div></div></article>
      <section className="mt-5"><h2 className="h4">Community comments</h2>{(gift.comments || []).length === 0 ? <p className="text-secondary">No comments yet.</p> : gift.comments.map((comment, index) => <div key={index} className="card my-3"><div className="card-body"><strong>{comment.author}</strong><p className="mb-0">{comment.comment}</p></div></div>)}</section>
    </>}
  </main>;
}
