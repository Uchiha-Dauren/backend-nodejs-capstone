const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    const error = new Error('JWT_SECRET must contain at least 32 characters.');
    error.status = 503;
    throw error;
  }
  return secret;
}

function createToken(user) {
  return jwt.sign({ email: user.email }, getSecret(), {
    subject: user._id.toString(),
    expiresIn: '2h',
    algorithm: 'HS256',
    issuer: 'secondchance',
    audience: 'secondchance-web',
  });
}

function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const token = /^Bearer\s+\S+$/i.test(authorization)
    ? authorization.replace(/^Bearer\s+/i, '')
    : req.get('auth-token');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
      issuer: 'secondchance',
      audience: 'secondchance-web',
    });
    if (!ObjectId.isValid(payload.sub)) throw new Error('Invalid token subject');
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    if (error.status === 503) return next(error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

module.exports = { requireAuth, createToken, getSecret };
