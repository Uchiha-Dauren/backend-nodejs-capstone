const assert = require('node:assert/strict');
const base = (process.env.API_BASE_URL || 'http://127.0.0.1:3060').replace(/\/$/, '');

(async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).database, 'connected');
  const landing = await fetch(`${base}/`);
  assert.equal(landing.status, 200);
  const html = await landing.text();
  assert.match(html, /<title>[^<]+<\/title>/i);
  assert.match(html, /get started/i);
  const spa = await fetch(`${base}/app`);
  assert.equal(spa.status, 200);
  assert.match(await spa.text(), /<div id="root"><\/div>/);
  const list = await fetch(`${base}/api/secondchance/items`);
  const items = await list.json();
  assert.equal(list.status, 200);
  assert.equal(items.length, 16);
  const image = await fetch(`${base}${items[0].image}`);
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /^image\//);
  const sentiment = await fetch(`${base}/api/sentiment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentence: 'This is a wonderful and excellent gift!' })
  });
  assert.equal(sentiment.status, 200);
  const analysis = await sentiment.json();
  assert.equal(typeof analysis.sentimentScore, 'number');
  assert.ok(analysis.sentimentScore > 0);
  console.log('PASS: deployed health, HTML landing, React entry, 16 MongoDB items, image and sentiment API.');
})().catch(error => { console.error(error); process.exitCode = 1; });
