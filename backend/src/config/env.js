const dotenv = require("dotenv");

dotenv.config();

const normalizeOrigin = (origin) => {
  const raw = String(origin || "").trim();
  if (!raw) return "";

  try {
    // Normalize full URLs (including accidental paths like /login) to bare origin.
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).origin.toLowerCase();
    }
  } catch {
    // Fall through to basic normalization for non-URL values.
  }

  return raw.replace(/\/+$/, "").toLowerCase();
};

const parseCorsOrigins = (value) => {
  const defaults = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://cap-ashfar-2025.netlify.app",
    "https://mcoll.netlify.app",
    "https://m2colla.netlify.app",
  ].map(normalizeOrigin);
  if (!value) return defaults;

  const origins = String(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return origins.length ? Array.from(new Set([...defaults, ...origins])) : defaults;
};

const parseClientUrls = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
  CLIENT_URL: parseClientUrls(process.env.CLIENT_URL || process.env.FRONTEND_URL),
  CORS_ORIGIN: parseCorsOrigins(
    [process.env.CORS_ORIGIN, process.env.CLIENT_URL, process.env.FRONTEND_URL]
      .filter(Boolean)
      .join(",")
  ),
};

const validateRequiredEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "CLIENT_URL"];
  const missing = required.filter((key) => !process.env[key]);

  missing.forEach((key) => {
    console.warn(`[env] Missing ${key}`);
  });

  return missing;
};

module.exports = { env, validateRequiredEnv };

