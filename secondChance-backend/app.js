require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const connectToDatabase = require('./models/db');
const authRoutes = require('./routes/authRoutes');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
app.disable('x-powered-by');
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

app.get('/health', async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    res.json({ status: 'ok', service: 'secondchance-api', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchance/search', searchRoutes);

// Keep the sentiment microservice on an internal address in production.
app.post('/api/sentiment', async (req, res, next) => {
  try {
    const response = await fetch(process.env.SENTIMENT_URL || 'http://127.0.0.1:5000/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(5000)
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    error.status = 503;
    error.publicMessage = 'The sentiment service is temporarily unavailable.';
    next(error);
  }
});
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

app.use('/images', express.static(path.join(__dirname, 'public', 'images'), {
  dotfiles: 'deny',
  maxAge: '1h'
}));
const frontendBuild = path.resolve(
  process.env.FRONTEND_BUILD || path.join(__dirname, '..', 'secondChance-frontend', 'build')
);
app.get(['/', '/home.html'], (req, res) => {
  const landing = path.join(frontendBuild, 'home.html');
  if (!fs.existsSync(landing)) {
    return res.status(503).send('Build the frontend with npm run build before opening the website.');
  }
  return res.sendFile(landing);
});
app.use(express.static(frontendBuild, { index: false, dotfiles: 'deny' }));
app.get(['/app', '/app/*'], (req, res) => res.sendFile(path.join(frontendBuild, 'index.html')));
app.use((req, res) => res.status(404).json({ error: 'Page not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status : error.name === 'MulterError' ? 400 : 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('Request failed:', error.name, error.message);
  }
  return res.status(status).json({
    error: error.publicMessage || (status < 500 ? error.message : 'Internal server error.')
  });
});

let server;
async function start(options = {}) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters.');
  }
  await connectToDatabase();
  await connectToDatabase.ensureIndexes();
  const port = options.port ?? Number(process.env.PORT || 3060);
  const host = options.host || process.env.HOST || '0.0.0.0';
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(port, host, () => resolve(listener));
    listener.once('error', reject);
  });
  if (process.env.NODE_ENV !== 'test') console.log(`SecondChance listening on port ${server.address().port}`);
  return server;
}

async function stop() {
  if (server) {
    const listener = server;
    server = undefined;
    await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  }
  await connectToDatabase.close();
}

if (require.main === module) {
  start().catch(error => {
    console.error('Startup failed:', error.message);
    process.exitCode = 1;
    connectToDatabase.close().catch(() => {});
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => stop().then(() => process.exit(0)).catch(() => process.exit(1)));
  }
}

module.exports = { app, start, stop };
