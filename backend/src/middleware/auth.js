// ──────────────────────────────────────────────
// JWT Authentication Middleware
// Verifies the Bearer token and attaches user
// payload (id, role) to req.user
// ──────────────────────────────────────────────

import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  // ── 1. Extract the token ─────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Accès refusé. Aucun token fourni.",
    });
  }

  const token = authHeader.split(" ")[1];

  // ── 2. Verify the token ──────────────────────
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token expiré. Veuillez vous reconnecter."
        : "Token invalide.";

    return res.status(401).json({
      success: false,
      message,
    });
  }
};

export default authenticate;
