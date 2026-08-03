const { verifyToken } = require("./_auth");

const DEFAULT_STATE = {
  addedTournaments: [],
  addedNonTitres: [],
  nameOverrides: {},
  rowOverrides: {},
  deletedIds: {},
  manualGames: [],
  stintOverrides: {},
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Variables Supabase manquantes");
  }

  return {
    endpoint: `${url}/rest/v1/site_data`,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  };
}

async function readData() {
  const { endpoint, headers } = getSupabaseConfig();

  const response = await fetch(
    `${endpoint}?id=eq.palmares&select=content`,
    {
      method: "GET",
      headers: {
        ...headers,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Lecture Supabase impossible : ${message}`);
  }

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length === 0 || !rows[0].content) {
    return DEFAULT_STATE;
  }

  return {
    ...DEFAULT_STATE,
    ...rows[0].content,
  };
}

async function saveData(content) {
  const { endpoint, headers } = getSupabaseConfig();

  const response = await fetch(
    `${endpoint}?id=eq.palmares`,
    {
      method: "PATCH",
      headers: {
        ...headers,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Écriture Supabase impossible : ${message}`);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const data = await readData();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const tokenSecret = process.env.TOKEN_SECRET;

      if (!tokenSecret || !verifyToken(token, tokenSecret)) {
        return res.status(401).json({
          error: "Non autorisé",
        });
      }

      const body =
        req.body && typeof req.body === "object"
          ? req.body
          : null;

      const shapeOk =
        body &&
        Array.isArray(body.addedTournaments) &&
        Array.isArray(body.addedNonTitres) &&
        body.nameOverrides &&
        typeof body.nameOverrides === "object" &&
        body.rowOverrides &&
        typeof body.rowOverrides === "object" &&
        body.deletedIds &&
        typeof body.deletedIds === "object" &&
        (body.manualGames === undefined ||
          Array.isArray(body.manualGames)) &&
        (body.stintOverrides === undefined ||
          typeof body.stintOverrides === "object");

      if (!shapeOk) {
        return res.status(400).json({
          error: "Format de données invalide",
        });
      }

      const size = Buffer.byteLength(
        JSON.stringify(body),
        "utf8"
      );

      if (size > 6 * 1024 * 1024) {
        return res.status(413).json({
          error: "Payload trop volumineux",
        });
      }

      const dataToStore = {
        ...DEFAULT_STATE,
        ...body,
      };

      await saveData(dataToStore);

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      error: "Méthode non autorisée",
    });
  } catch (error) {
    console.error("Erreur api/data :", error);

    return res.status(500).json({
      error:
        error && error.message
          ? error.message
          : "Erreur serveur inconnue",
    });
  }
};
