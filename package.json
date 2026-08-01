const crypto = require('crypto');

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sign(expiry, secret) {
  return crypto.createHmac('sha256', secret).update(`editor:${expiry}`).digest('hex');
}

// Stateless token: "<expiryEpochSeconds>.<hmac>". No DB/session lookup needed to verify.
function makeToken(secret, ttlSeconds = THIRTY_DAYS) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(expiry, secret);
  return `${expiry}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiryStr, sig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (!Number.isFinite(expiry)) return false;
  if (expiry < Math.floor(Date.now() / 1000)) return false;

  const expected = sign(expiry, secret);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { makeToken, verifyToken };
