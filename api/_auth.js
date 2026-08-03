const crypto = require("crypto");

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sign(expiry, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`editor:${expiry}`)
    .digest("hex");
}

function makeToken(secret, ttlSeconds = THIRTY_DAYS) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = sign(expiry, secret);

  return `${expiry}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !secret) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [expiryString, signature] = parts;
  const expiry = Number.parseInt(expiryString, 10);

  if (!Number.isFinite(expiry)) {
    return false;
  }

  if (expiry < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = sign(expiry, secret);
  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

module.exports = {
  makeToken,
  verifyToken,
};
