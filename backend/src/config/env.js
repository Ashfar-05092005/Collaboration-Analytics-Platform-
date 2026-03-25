const dotenv = require("dotenv");

dotenv.config();

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "").toLowerCase();

const parseCorsOrigins = (value) => {
  const defaults = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "https://collaboration-analytics-platform-frontend.onrender.com",
  ].map(normalizeOrigin);
  if (!value) return defaults;

  const origins = String(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return origins.length ? Array.from(new Set([...defaults, ...origins])) : defaults;
};

const logMissingEnvWarnings = (env) => {
  const required = [
    { key: "MONGO_URI", value: env.MONGO_URI, critical: true },
    { key: "JWT_ACCESS_SECRET/JWT_SECRET", value: env.JWT_ACCESS_SECRET, critical: true },
    { key: "JWT_REFRESH_SECRET", value: env.JWT_REFRESH_SECRET, critical: false },
  ];

  const missing = required.filter((entry) => !entry.value);
  if (missing.length) {
    const criticalMissing = missing.filter((m) => m.critical);
    const warnings = missing.filter((m) => !m.critical);

    if (criticalMissing.length) {
      console.warn(
        `[env] ⚠ CRITICAL: Missing required variables: ${criticalMissing.map((m) => m.key).join(", ")}`
      );
    }
    if (warnings.length) {
      console.warn(
        `[env] ⚠ WARNING: Missing optional variables: ${warnings.map((m) => m.key).join(", ")}`
      );
    }
  } else {
    console.log("[env] ✓ All required environment variables are set");
  }
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
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS || 10,
  CORS_ORIGIN: parseCorsOrigins(process.env.CORS_ORIGIN),
};

logMissingEnvWarnings(env);

if (env.NODE_ENV === "production") {
  console.log("[env] Production mode enabled");
}

module.exports = { env };

