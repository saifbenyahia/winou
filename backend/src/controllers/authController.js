// ──────────────────────────────────────────────
// Auth Controller — Business logic for authentication
// ──────────────────────────────────────────────

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as UserModel from "../models/userModel.js";

/**
 * POST /api/auth/register
 * Expects: { name, email, password }
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ── 1. Validate input ──────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires (name, email, password).",
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Format d'email invalide.",
      });
    }

    // Password strength: minimum 6 characters
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 6 caractères.",
      });
    }

    // ── 2. Check for existing user ─────────────────
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Un compte avec cet email existe déjà.",
      });
    }

    // ── 3. Hash password ───────────────────────────
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ── 4. Create user ─────────────────────────────
    const newUser = await UserModel.create(name, email, passwordHash);

    // ── 5. Return success ──────────────────────────
    return res.status(201).json({
      success: true,
      message: "Inscription réussie.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * POST /api/auth/login
 * Expects: { email, password }
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── 1. Validate input ──────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe sont obligatoires.",
      });
    }

    // ── 2. Find user by email ──────────────────────
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect.",
      });
    }

    // ── 3. Verify password ─────────────────────────
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect.",
      });
    }

    // ── 4. Sign JWT ────────────────────────────────
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // ── 5. Return token + user data ────────────────
    return res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio || '',
        avatar: user.avatar || '',
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};

/**
 * PUT /api/auth/profile  (Protected)
 * Updates the authenticated user's name, email, and/or bio.
 * No password required.
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, avatar } = req.body;

    // ── Check email uniqueness if changing ────────
    if (email) {
      const user = await UserModel.findById(req.user.id);
      if (email !== user.email) {
        const existing = await UserModel.findByEmail(email);
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "Un compte avec cet email existe déjà.",
          });
        }
      }
    }

    // ── Update profile ───────────────────────────
    const updated = await UserModel.updateProfile(req.user.id, {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? email.trim() : undefined,
      bio: bio !== undefined ? bio : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    return res.status(200).json({
      success: true,
      message: "Profil mis à jour avec succès.",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        bio: updated.bio || '',
        avatar: updated.avatar || '',
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

/**
 * PUT /api/auth/password  (Protected)
 * Changes the authenticated user's password.
 * Requires: { currentPassword, newPassword }
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // ── 1. Validate ───────────────────────────────
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "L'ancien et le nouveau mot de passe sont obligatoires.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères.",
      });
    }

    // ── 2. Verify current password ────────────────
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mot de passe actuel incorrect.",
      });
    }

    // ── 3. Hash and save new password ─────────────
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await UserModel.updatePassword(req.user.id, newHash);

    return res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};
