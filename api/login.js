const { makeToken } = require("./_auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const expectedPassword = process.env.EDITOR_PASSWORD;
  const tokenSecret = process.env.TOKEN_SECRET;

  if (!expectedPassword || !tokenSecret) {
    return res.status(500).json({
      error: "Serveur mal configuré : variables manquantes",
    });
  }

  const password =
    req.body && typeof req.body === "object"
      ? req.body.password
      : undefined;

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    password !== expectedPassword
  ) {
    return res.status(401).json({
      error: "Mot de passe incorrect",
    });
  }

  const token = makeToken(tokenSecret);

  return res.status(200).json({ token });
};
