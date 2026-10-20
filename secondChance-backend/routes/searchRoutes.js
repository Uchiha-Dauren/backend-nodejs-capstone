const express = require('express');
const connectToDatabase = require('../models/db');

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const query = {};
    for (const key of ['name', 'category', 'condition']) {
      const value = req.query[key];
      if (value === undefined || value === '') continue;
      if (typeof value !== 'string' || value.length > 100) {
        return res.status(400).json({ error: `${key} must be a string of up to 100 characters.` });
      }
      if (!value.trim()) continue;
      const term = escapeRegex(value.trim());
      query[key] = { $regex: key === 'name' ? term : `^${term}$`, $options: 'i' };
    }
    if (req.query.age_years !== undefined && req.query.age_years !== '') {
      const age = Number(req.query.age_years);
      if (typeof req.query.age_years !== 'string' || !Number.isFinite(age) || age < 0 || age > 1000) {
        return res.status(400).json({ error: 'age_years must be a non-negative number up to 1000.' });
      }
      query.age_years = { $lte: age };
    }
    const db = await connectToDatabase();
    const items = await db.collection('secondChanceItems').find(query).toArray();
    res.json(items);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
