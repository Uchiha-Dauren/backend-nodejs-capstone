const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const connectToDatabase = require('../models/db');
const { requireAuth, createToken, getSecret } = require('../middleware/auth');

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name || `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
  };
}

function loginResponse(user) {
  const visibleUser = publicUser(user);
  return {
    authtoken: createToken(user),
    userName: visibleUser.name,
    userEmail: user.email,
    email: user.email,
    user: visibleUser,
  };
}

function validName(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100;
}

function normalizedEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const email = normalizedEmail(req.body.email);
    if (!email || !validName(firstName) || !validName(lastName)) {
      return res.status(400).json({ error: 'Enter a valid email, first name and last name.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and no more than 72 UTF-8 bytes.' });
    }
    getSecret();
    await connectToDatabase.ensureIndexes();
    const db = await connectToDatabase();
    const user = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      email,
      password: await bcrypt.hash(password, 12),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
    return res.status(201).json(loginResponse(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body.email);
    const password = req.body.password;
    if (!email || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Enter a valid email and password.' });
    }
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    return res.json(loginResponse(user));
  } catch (error) {
    next(error);
  }
});

router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

router.put('/update', requireAuth, async (req, res, next) => {
  try {
    const { name, firstName, lastName } = req.body;
    if (![name, firstName, lastName].some((value) => value !== undefined)) {
      return res.status(400).json({ error: 'Provide a name to update.' });
    }
    if ([name, firstName, lastName].some((value) => value !== undefined && !validName(value))) {
      return res.status(400).json({ error: 'Names must contain between 1 and 100 characters.' });
    }
    if (req.body.email !== undefined && normalizedEmail(req.body.email) !== req.user.email) {
      return res.status(400).json({ error: 'This endpoint does not change email addresses.' });
    }
    const db = await connectToDatabase();
    const users = db.collection('users');
    const userId = new ObjectId(req.user.id);
    const existing = await users.findOne({ _id: userId });
    if (!existing) return res.status(404).json({ error: 'User not found.' });
    const changes = { updatedAt: new Date() };
    if (firstName !== undefined) changes.firstName = firstName.trim();
    if (lastName !== undefined) changes.lastName = lastName.trim();
    changes.name = name !== undefined
      ? name.trim()
      : `${changes.firstName || existing.firstName} ${changes.lastName || existing.lastName}`.trim();
    const updated = await users.findOneAndUpdate(
      { _id: userId }, { $set: changes }, { returnDocument: 'after' },
    );
    return res.json({ message: 'Profile updated successfully.', ...publicUser(updated) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
