const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");
const { env, validateRequiredEnv } = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const issueRoutes = require("./routes/issueRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const activityRoutes = require("./routes/activityRoutes");
const pointsRoutes = require("./routes/pointsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { errorHandler } = require("./middlewares/error");

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeOrigin = (origin) => {
  const raw = String(origin || "").trim();
  if (!raw) return "";

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).origin.toLowerCase();
    }
  } catch {
    // Fall through to basic normalization for non-URL values.
  }

  return raw.replace(/\/+$/, "").toLowerCase();
};

const allowedOrigins = Array.from(
  new Set([...env.CORS_ORIGIN, ...env.CLIENT_URL, normalizeOrigin(process.env.FRONTEND_URL)].filter(Boolean))
);

process.on("uncaughtException", (err) => console.error("Uncaught Exception:", err));
process.on("unhandledRejection", (err) => console.error("Unhandled Rejection:", err));

app.set("trust proxy", 1);

app.use(helmet());
app.use(compression({ level: 6, threshold: 1024 }));
app.use(
  cors({
    origin: function (origin, callback) {
      const normalizedOrigin = normalizeOrigin(origin);

      if (!origin || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`[cors] Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => res.send("Server running"));

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

// Prevent noisy 404s for browser favicon requests
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.param("id", (req, res, next, value) => {
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ success: false, data: null, message: "Invalid id" });
  }
  return next();
});

app.param("memberId", (req, res, next, value) => {
  if (!mongoose.isValidObjectId(value)) {
    return res.status(400).json({ success: false, data: null, message: "Invalid memberId" });
  }
  return next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(errorHandler);

const startServer = async () => {
  const missingEnv = validateRequiredEnv();
  if (missingEnv.length) {
    console.error(`[env] Missing required environment variables: ${missingEnv.join(", ")}`);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    console.error("[startup] Server listen error:", error.message || error);
  });

  try {
    let dbConnected = await connectDB();
    while (!dbConnected) {
      console.warn("[startup] MongoDB not ready, retrying in 5000ms...");
      await wait(5000);
      dbConnected = await connectDB();
    }
    console.log("[startup] MongoDB ready.");
  } catch (error) {
    console.error("[startup] MongoDB startup error:", error.message || error);
  }

  return server;
};

module.exports = { app, startServer };

