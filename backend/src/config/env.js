const dotenv = require("dotenv");

dotenv.config();

const parseCorsOrigins = (value) => {
  const defaults = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];
  if (!value) return defaults;

  const origins = String(value)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : defaults;
};

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
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
};

const validateRequiredEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  missing.forEach((key) => {
    console.warn(`[env] Missing ${key}`);
  });

  return missing;
};

module.exports = { env, validateRequiredEnv };

