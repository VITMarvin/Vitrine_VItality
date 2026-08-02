const { getStore } = require('@netlify/blobs');
const { verifyToken } = require('./utils/auth');

const DEFAULT_STATE = {
  addedTournaments: [],
  addedNonTitres: [],
  nameOverrides: {},
  rowOverrides: {},
  deletedIds: {},
  manualGames: [],
  activeOverrides: {},
};

function openStore() {
  // Automatic context injection (siteID/token guessed from the deploy) is
  // known to be unreliable on some Netlify deploys (documented platform
  // issue: MissingBlobsEnvironmentError). If BLOBS_SITE_ID / BLOBS_TOKEN
  // are set, use them explicitly — this is the reliable path.
  if (process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN) {
    return getStore({
      name: 'vitality-data',
      siteID: process.env.BLOBS_SITE_ID,
      token: process.env.BLOBS_TOKEN,
    });
  }
  return getStore('vitality-data');
}

exports.handler = async (event) => {
  try {
    const store = openStore();

    if (event.httpMethod === 'GET') {
      let raw = null;
      try {
        raw = await store.get('state', { type: 'json' });
      } catch (e) {
        raw = null;
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(raw || DEFAULT_STATE),
      };
    }

    if (event.httpMethod === 'POST') {
      const authHeader = event.headers.authorization || event.headers.Authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const secret = process.env.TOKEN_SECRET;

      if (!secret || !verifyToken(token, secret)) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Non autorisé' }) };
      }

      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
      }

      const shapeOk =
        body &&
        typeof body === 'object' &&
        Array.isArray(body.addedTournaments) &&
        Array.isArray(body.addedNonTitres) &&
        body.nameOverrides &&
        typeof body.nameOverrides === 'object' &&
        body.rowOverrides &&
        typeof body.rowOverrides === 'object' &&
        body.deletedIds &&
        typeof body.deletedIds === 'object' &&
        (body.manualGames === undefined || Array.isArray(body.manualGames)) &&
        (body.activeOverrides === undefined || typeof body.activeOverrides === 'object');

      if (!shapeOk) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Format de données invalide' }) };
      }

      // Basic size guard so a bad payload can't blow up storage
      const size = Buffer.byteLength(event.body || '', 'utf8');
      if (size > 3 * 1024 * 1024) {
        return { statusCode: 413, body: JSON.stringify({ error: 'Payload trop volumineux' }) };
      }

      const toStore = Object.assign({}, DEFAULT_STATE, body);
      await store.setJSON('state', toStore);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (err) {
    // Never let this bubble up as a raw platform 502 — always return
    // diagnosable JSON so the frontend can show a useful error.
    console.error('data function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: (err && err.message) || 'Erreur serveur inconnue' }),
    };
  }
};
