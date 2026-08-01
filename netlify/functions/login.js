const { makeToken } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const password = body.password;
  const expected = process.env.EDITOR_PASSWORD;
  const secret = process.env.TOKEN_SECRET;

  if (!expected || !secret) {
    // Misconfigured site: env vars not set in Netlify dashboard
    return { statusCode: 500, body: JSON.stringify({ error: 'Serveur mal configuré (variables manquantes)' }) };
  }

  if (typeof password !== 'string' || password.length === 0 || password !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Mot de passe incorrect' }) };
  }

  const token = makeToken(secret);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  };
};
