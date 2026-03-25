const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { env } = require("./config/env");
const mongoose = require("mongoose");
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

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "").toLowerCase();

app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// Compression middleware for API responses
app.use(compression({ level: 6, threshold: 1024 }));

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (env.NODE_ENV !== "production") return callback(null, true);
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);
      const allowedOrigins = Array.isArray(env.CORS_ORIGIN) ? env.CORS_ORIGIN : [env.CORS_ORIGIN];
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Request parsing middleware with limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Logging middleware
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Request timeout middleware (30 seconds for all requests)
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// Rate limiting middleware
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // max 120 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
  })
);

// Health check routes
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.get("/health", (req, res) => {
  const health = {
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  res.status(200).json(health);
});

// Prevent noisy 404s for browser favicon requests
app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: "Database unavailable. Please retry shortly.",
    });
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

module.exports = { app, env };

