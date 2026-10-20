const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const connectToDatabase = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const directoryPath = path.resolve(__dirname, '../public/images');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 15 },
});

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function itemFields(body, partial = false) {
  const result = {};
  for (const field of ['name', 'category', 'condition', 'description', 'zipcode']) {
    const value = body[field];
    if (value === undefined) {
      if (!partial && ['name', 'category', 'condition'].includes(field)) {
        throw invalid(`${field} is required.`);
      }
      continue;
    }
    const limit = field === 'description' ? 5000 : 200;
    if (typeof value !== 'string' || value.length > limit || (!value.trim() && ['name', 'category', 'condition'].includes(field))) {
      throw invalid(`${field} must be a valid string of up to ${limit} characters.`);
    }
    result[field] = value.trim();
  }
  if (body.age_days !== undefined || !partial) {
    const raw = body.age_days === undefined ? 0 : body.age_days;
    const age = Number(raw);
    if (!['string', 'number'].includes(typeof raw) || !Number.isFinite(age) || age < 0 || age > 365000) {
      throw invalid('age_days must be a non-negative number up to 365000.');
    }
    result.age_days = age;
    result.age_years = Number((age / 365).toFixed(1));
  }
  if (body.image !== undefined) {
    if (typeof body.image !== 'string' || !/^\/images\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|gif|webp)$/i.test(body.image)) {
      throw invalid('image must refer to an image in /images/.');
    }
    result.image = body.image;
  }
  return result;
}

function imageExtension(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return '.jpg';
  if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())) return '.gif';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return '.webp';
  throw invalid('Upload a PNG, JPEG, GIF or WebP image.');
}

async function nextItemId(db) {
  // Convert string seed IDs before finding the maximum; an atomic counter
  // prevents duplicate IDs when several items are added simultaneously.
  const [maximum] = await db.collection('secondChanceItems').aggregate([
    { $group: { _id: null, max: { $max: { $convert: { input: '$id', to: 'long', onError: 0, onNull: 0 } } } } },
  ]).toArray();
  const counters = db.collection('counters');
  try {
    await counters.updateOne({ _id: 'items' }, { $max: { value: Number(maximum?.max || 0) } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const counter = await counters.findOneAndUpdate({ _id: 'items' }, { $inc: { value: 1 } }, { returnDocument: 'after' });
  return String(counter.value);
}

router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const secondChanceItems = await db.collection('secondChanceItems').find({}).toArray();
    res.json(secondChanceItems);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const item = await db.collection('secondChanceItems').findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'secondChanceItem not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  let uploadedPath;
  try {
    // A multipart client may send its original filename in `image`; use the
    // validated upload's generated path instead of trusting that filename.
    const fields = { ...req.body };
    if (req.file) delete fields.image;
    const item = itemFields(fields);
    if (req.file) {
      const filename = `${randomUUID()}${imageExtension(req.file.buffer)}`;
      await fs.mkdir(directoryPath, { recursive: true });
      uploadedPath = path.join(directoryPath, filename);
      await fs.writeFile(uploadedPath, req.file.buffer, { flag: 'wx' });
      item.image = `/images/${filename}`;
    }
    await connectToDatabase.ensureIndexes();
    const db = await connectToDatabase();
    item.id = await nextItemId(db);
    item.date_added = Math.floor(Date.now() / 1000);
    item.posted_by = req.user.id;
    item.comments = [];
    const result = await db.collection('secondChanceItems').insertOne(item);
    item._id = result.insertedId;
    res.status(201).json(item);
  } catch (error) {
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    next(error);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const updates = itemFields(req.body, true);
    if (!Object.keys(updates).length) throw invalid('Provide at least one item field to update.');
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const existing = await collection.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'secondChanceItem not found' });
    if (existing.posted_by !== req.user.id) return res.status(403).json({ error: 'Only the owner can update this item.' });
    updates.updatedAt = new Date();
    const item = await collection.findOneAndUpdate(
      { id: req.params.id, posted_by: req.user.id },
      { $set: updates },
      { returnDocument: 'after' },
    );
    if (!item) return res.status(404).json({ error: 'secondChanceItem not found' });
    res.json({ ...item, uploaded: 'success' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const existing = await collection.findOne({ id: req.params.id });
    if (!existing) return res.status(404).json({ error: 'secondChanceItem not found' });
    if (existing.posted_by !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete this item.' });
    const result = await collection.deleteOne({ id: req.params.id, posted_by: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ error: 'secondChanceItem not found' });
    res.json({ deleted: 'success' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
