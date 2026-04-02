// ──────────────────────────────────────────────
// Hive.tn — Express Server Entry Point
// ──────────────────────────────────────────────

import "dotenv/config";        // Load .env FIRST — before any module reads process.env
import express from "express";
import cors from "cors";

// Database (imported for its side-effect: connection test on startup)
import "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Middleware ──────────────────────────────────
app.use(cors());                // Allow cross-origin requests from the Vite frontend
app.use(express.json({ limit: "50mb" }));        // Parse JSON request bodies (increased limit for base64 avatars)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── API Routes ─────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/admin", adminRoutes);

// ── Health Check ───────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Server ───────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Hive.tn API running on http://localhost:${PORT}`);
});
