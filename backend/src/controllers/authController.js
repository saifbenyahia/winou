import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import * as UserModel from '../models/userModel.js';
import { sendWelcomeNotification } from '../services/notificationService.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  bio: user.bio || '',
  avatar: user.avatar || '',
  auth_provider: user.auth_provider || 'local',
  email_verified: !!user.email_verified,
});

const issueToken = (user) => jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const getGoogleCallbackUrl = () => process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

const encodeFrontendUser = (user) => Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');

const createGoogleState = () => jwt.sign(
  { provider: 'google', nonce: randomUUID() },
  process.env.JWT_SECRET,
  { expiresIn: '10m' }
);

const verifyGoogleState = (state) => {
  const decoded = jwt.verify(state, process.env.JWT_SECRET);
  if (decoded.provider !== 'google') {
    throw new Error('Etat OAuth invalide.');
  }
  return decoded;
};

const redirectToFrontend = (res, params = {}) => {
  const hash = new URLSearchParams(params).toString();
  res.redirect(`${getFrontendUrl()}/auth/google/callback${hash ? `#${hash}` : ''}`);
};

const ensureGoogleConfig = () => {
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'JWT_SECRET'].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Configuration Google OAuth incomplète: ${missing.join(', ')}`);
  }
};

const exchangeCodeForTokens = async (code) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Impossible de récupérer les jetons Google.');
  }
  return data;
};

const fetchGoogleProfile = async (accessToken) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Impossible de récupérer le profil Google.');
  }
  return data;
};

const resolveGoogleUser = async (googleProfile) => {
  const email = String(googleProfile.email || '').trim().toLowerCase();
  const googleId = googleProfile.sub;
  const emailVerified = !!googleProfile.email_verified;
  const displayName = String(googleProfile.name || email.split('@')[0] || 'Utilisateur Hive').trim();
  const avatar = googleProfile.picture || '';

  if (!googleId || !email) {
    throw new Error('Le compte Google fourni ne contient pas les informations requises.');
  }

  const userByGoogleId = await UserModel.findByGoogleId(googleId);
  if (userByGoogleId) {
    return userByGoogleId;
  }

  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    if (existingUser.google_id && existingUser.google_id !== googleId) {
      throw new Error('Cet email est déjà lié à un autre compte Google.');
    }

    if (!emailVerified) {
      throw new Error('Google doit confirmer l’email avant de pouvoir lier ce compte.');
    }

    return UserModel.linkGoogleAccount(existingUser.id, {
      googleId,
      avatar,
      emailVerified,
    });
  }

  if (!emailVerified) {
    throw new Error('Votre adresse email Google doit être vérifiée pour créer un compte Hive.tn.');
  }

  const createdUser = await UserModel.createGoogleUser({
    name: displayName,
    email,
    googleId,
    avatar,
    emailVerified,
  });

  await sendWelcomeNotification(createdUser);
  return createdUser;
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires (name, email, password).',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Format d'email invalide." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caracteres.' });
    }

    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.google_id
          ? 'Un compte existe deja avec cet email. Connectez-vous avec Google ou utilisez un mot de passe existant.'
          : 'Un compte avec cet email existe deja.',
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newUser = await UserModel.create(name.trim(), normalizedEmail, passwordHash);
    await sendWelcomeNotification(newUser);

    return res.status(201).json({
      success: true,
      message: 'Inscription reussie.',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe sont obligatoires.' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte utilise Google. Continuez avec Google pour vous connecter.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Connexion reussie.',
      token: issueToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};

export const startGoogleAuth = async (_req, res) => {
  try {
    ensureGoogleConfig();
    const state = createGoogleState();
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: getGoogleCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state,
    }).toString();

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error('Google auth start error:', error);
    return redirectToFrontend(res, { error: 'Configuration Google indisponible.' });
  }
};

export const handleGoogleCallback = async (req, res) => {
  try {
    ensureGoogleConfig();

    if (req.query.error) {
      return redirectToFrontend(res, { error: 'Connexion Google annulee.' });
    }

    const { code, state } = req.query;
    if (!code || !state) {
      return redirectToFrontend(res, { error: 'Reponse Google incomplete.' });
    }

    verifyGoogleState(String(state));
    const tokens = await exchangeCodeForTokens(String(code));
    const googleProfile = await fetchGoogleProfile(tokens.access_token);
    const user = await resolveGoogleUser(googleProfile);
    const appUser = sanitizeUser(user);

    return redirectToFrontend(res, {
      token: issueToken(user),
      user: encodeFrontendUser(appUser),
    });
  } catch (error) {
    console.error('Google callback error:', error);
    return redirectToFrontend(res, {
      error: error.message || 'Impossible de finaliser la connexion Google.',
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, avatar } = req.body;

    if (email) {
      const user = await UserModel.findById(req.user.id);
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await UserModel.findByEmail(normalizedEmail);
        if (existing) {
          return res.status(409).json({ success: false, message: 'Un compte avec cet email existe deja.' });
        }
      }
    }

    const updated = await UserModel.updateProfile(req.user.id, {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? email.trim().toLowerCase() : undefined,
      bio: bio !== undefined ? bio : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profil mis a jour avec succes.',
      user: sanitizeUser(updated),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe est obligatoire.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres.' });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "L'ancien mot de passe est obligatoire.",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect.' });
      }
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await UserModel.updatePassword(req.user.id, newHash);

    return res.status(200).json({
      success: true,
      message: user.password_hash
        ? 'Mot de passe modifie avec succes.'
        : 'Mot de passe ajoute avec succes. Vous pourrez aussi vous connecter par email.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
  }
};



