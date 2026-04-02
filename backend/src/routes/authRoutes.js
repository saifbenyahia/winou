// ──────────────────────────────────────────────
// Auth Routes — /api/auth/*
// ──────────────────────────────────────────────

import { Router } from "express";
import { register, login, updateProfile, changePassword } from "../controllers/authController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// PUT /api/auth/profile  (Protected — update name/email)
router.put("/profile", authenticate, updateProfile);

// PUT /api/auth/password  (Protected — change password)
router.put("/password", authenticate, changePassword);

export default router;
