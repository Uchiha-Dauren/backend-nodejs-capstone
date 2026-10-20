const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

process.env.NODE_ENV = 'test';
process.env.MONGO_URL ||= 'mongodb://127.0.0.1:27017';
// Each run owns a fresh database, so tests cannot delete the demonstration data.
process.env.MONGO_DB = `secondChance_test_${process.pid}_${Date.now()}`;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
const databaseName = process.env.MONGO_DB;
const connectToDatabase = require('../secondChance-backend/models/db');
const { loadData } = require('../secondChance-backend/util/import-mongo');
const { start, stop } = require('../secondChance-backend/app');
let base;
let token;
let otherToken;
let createdId;
const uploadedFiles = new Set();
const password = 'Test-Only-Password-876!';
const account = { firstName: 'Integration', lastName: 'Tester', email: 'integration@example.test', password };

async function request(route, options = {}) {
  const headers = { ...options.headers };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(`${base}${route}`, { method: options.method || 'GET', headers, body });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: response.status, data, headers: response.headers };
}

before(async () => {
  const listener = await start({ port: 0, host: '127.0.0.1' });
  base = `http://127.0.0.1:${listener.address().port}`;
  const seeded = await loadData();
  assert.equal(seeded.insertedCount, 16);
}, { timeout: 30000 });

after(async () => {
  try {
    if (!/^secondChance_test_\d+_\d+$/.test(databaseName)) throw new Error('Refusing to clean an unowned database.');
    const db = await connectToDatabase();
    assert.equal(db.databaseName, databaseName);
    await db.dropDatabase();
  } finally {
    for (const file of uploadedFiles) await fs.unlink(file).catch(() => {});
    await stop();
  }
});

test('health checks the real MongoDB connection', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.equal(result.data.database, 'connected');
});

test('seeding imports exactly 16 gifts and a second seed creates no duplicates', async () => {
  const result = await request('/api/secondchance/items');
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 16);
  assert.equal(new Set(result.data.map(item => item.id)).size, 16);
  const seeded = await loadData();
  assert.equal(seeded.insertedCount, 0);
  assert.equal(seeded.totalCount, 16);
});

test('one gift can be retrieved by its ID and unknown IDs return 404', async () => {
  const result = await request('/api/secondchance/items/875');
  assert.equal(result.status, 200);
  assert.equal(result.data.name, 'Lamp');
  assert.equal((await request('/api/secondchance/items/nonexistent')).status, 404);
});

test('search combines case-insensitive name and category filters', async () => {
  const result = await request('/api/secondchance/search?name=lamp&category=Kitchen');
  assert.equal(result.status, 200);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].id, '875');
  assert.equal((await request('/api/secondchance/search?name=lamp&category=Nonexistent')).data.length, 0);
});

test('search treats special regular-expression characters as text', async () => {
  const result = await request('/api/secondchance/search?name=%5B');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, []);
});

test('registration stores a password hash and never returns password fields', async () => {
  const result = await request('/api/auth/register', { method: 'POST', body: account });
  assert.equal(result.status, 201);
  assert.equal(result.data.user.email, account.email);
  assert.equal(result.data.user.password, undefined);
  assert.equal(result.data.user.passwordHash, undefined);
  assert.equal(typeof result.data.authtoken, 'string');
  token = result.data.authtoken;
  const db = await connectToDatabase();
  const stored = await db.collection('users').findOne({ email: account.email });
  assert.ok(stored);
  const hash = stored.passwordHash || stored.password;
  assert.equal(typeof hash, 'string');
  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$/);
});

test('duplicate account creation is prevented even for concurrent requests', async () => {
  const body = { ...account, email: 'race@example.test' };
  const results = await Promise.all(Array.from({ length: 3 }, () => request('/api/auth/register', { method: 'POST', body })));
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409, 409]);
  const db = await connectToDatabase();
  assert.equal(await db.collection('users').countDocuments({ email: body.email }), 1);
});

test('invalid registration and failed login produce appropriate failures', async () => {
  const invalid = await request('/api/auth/register', { method: 'POST', body: { ...account, email: 'not-an-email', password: 'short' } });
  assert.equal(invalid.status, 400);
  const failed = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password: 'incorrect-password' } });
  assert.equal(failed.status, 401);
});

test('login returns a usable JWT and authenticated profile', async () => {
  const login = await request('/api/auth/login', { method: 'POST', body: { email: account.email, password } });
  assert.equal(login.status, 200);
  token = login.data.authtoken;
  assert.equal(typeof token, 'string');
  const profile = await request('/api/auth/profile', { token });
  assert.equal(profile.status, 200);
  const user = profile.data.user || profile.data;
  assert.equal(user.email, account.email);
  assert.equal(user.password, undefined);
  assert.equal(user.passwordHash, undefined);
});

test('missing and tampered JWTs cannot update a profile', async () => {
  assert.equal((await request('/api/auth/update', { method: 'PUT', body: { firstName: 'Changed' } })).status, 401);
  const forged = `${token.slice(0, -6)}broken`;
  assert.equal((await request('/api/auth/update', { method: 'PUT', body: { firstName: 'Changed' }, token: forged })).status, 401);
});

test('authenticated profile update persists the name', async () => {
  const update = await request('/api/auth/update', { method: 'PUT', body: { firstName: 'Updated', lastName: 'Tester' }, token });
  assert.equal(update.status, 200);
  const profile = await request('/api/auth/profile', { token });
  assert.equal((profile.data.user || profile.data).firstName, 'Updated');
});

test('creating a gift requires authentication', async () => {
  const item = { name: 'Integration desk', category: 'Office', condition: 'Used', description: 'A sturdy desk.', zipcode: '12345' };
  const denied = await request('/api/secondchance/items', { method: 'POST', body: item });
  assert.equal(denied.status, 401);
  const created = await request('/api/secondchance/items', { method: 'POST', body: item, token });
  assert.equal(created.status, 201);
  assert.equal(created.data.name, item.name);
  assert.ok(created.data.id);
  createdId = created.data.id;
});

test('another account cannot change or delete a gift it does not own', async () => {
  const register = await request('/api/auth/register', {
    method: 'POST', body: { ...account, firstName: 'Other', email: 'other@example.test' }
  });
  assert.equal(register.status, 201);
  otherToken = register.data.authtoken;
  const route = `/api/secondchance/items/${createdId}`;
  assert.equal((await request(route, { method: 'PUT', body: { name: 'Stolen update' }, token: otherToken })).status, 403);
  assert.equal((await request(route, { method: 'DELETE', token: otherToken })).status, 403);
});

test('an owner can update and delete the gift and deletion persists', async () => {
  const route = `/api/secondchance/items/${createdId}`;
  const updated = await request(route, { method: 'PUT', body: { name: 'Updated integration desk' }, token });
  assert.equal(updated.status, 200);
  assert.equal((await request(route)).data.name, 'Updated integration desk');
  const removed = await request(route, { method: 'DELETE', token });
  assert.equal(removed.status, 200);
  assert.equal(removed.data.deleted, 'success');
  assert.equal((await request(route)).status, 404);
  assert.equal((await request('/api/secondchance/items')).data.length, 16);
});

test('uploaded non-image data is rejected', async () => {
  const form = new FormData();
  form.set('name', 'Bad upload');
  form.set('category', 'Office');
  form.set('condition', 'Used');
  form.set('file', new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'page.html');
  const result = await request('/api/secondchance/items', { method: 'POST', body: form, token });
  assert.equal(result.status, 400);
});

test('a real image upload is renamed, served and associated with its gift', async () => {
  // The original lamp photograph exceeds the deliberate 5 MiB upload limit.
  const bytes = await fs.readFile(path.join(__dirname, '../secondChance-backend/public/images/coffee-table.jpeg'));
  const form = new FormData();
  form.set('name', 'Uploaded coffee table');
  form.set('category', 'Kitchen');
  form.set('condition', 'Used');
  form.set('file', new Blob([bytes], { type: 'image/jpeg' }), 'original table photograph.jpeg');
  const created = await request('/api/secondchance/items', { method: 'POST', body: form, token });
  assert.equal(created.status, 201);
  assert.match(created.data.image, /^\/images\/[0-9a-f-]{36}\.jpg$/);
  uploadedFiles.add(path.join(__dirname, '../secondChance-backend/public', created.data.image));
  const image = await fetch(`${base}${created.data.image}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
  assert.equal((await request(`/api/secondchance/items/${created.data.id}`, { method: 'DELETE', token })).status, 200);
});

test('concurrent gift creation assigns unique IDs above the seed range', async () => {
  const results = await Promise.all(Array.from({ length: 6 }, (_, index) => request('/api/secondchance/items', {
    method: 'POST', token,
    body: { name: `Concurrent gift ${index}`, category: 'Office', condition: 'Used' }
  })));
  for (const result of results) assert.equal(result.status, 201);
  const ids = results.map(result => result.data.id);
  assert.equal(new Set(ids).size, 6);
  for (const id of ids) assert.ok(Number(id) > 875);
  for (const id of ids) {
    assert.equal((await request(`/api/secondchance/items/${id}`, { method: 'DELETE', token })).status, 200);
  }
  assert.equal((await request('/api/secondchance/items')).data.length, 16);
});

test('API errors remain JSON and requests cannot read environment files', async () => {
  const missing = await request('/api/not-a-route');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
  assert.equal((await request('/.env')).status, 404);
});
