const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
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

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught Exception:", err);
  // Continue running - don't exit unless critical
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[process] Unhandled Rejection at:", promise, "reason:", reason);
  // Continue running - don't exit unless critical
});

const app = express();
const PORT = process.env.PORT || 5000;

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
  let server;
  try {
    console.log("[startup] Starting backend server...");
    console.log(`[startup] Environment: ${env.NODE_ENV}`);
    console.log("[startup] Connecting to MongoDB...");
    
    await connectDB();
    console.log("[startup] MongoDB connection successful");

    server = app.listen(PORT, () => {
      console.log(`[startup] ✓ Backend running on port ${PORT}`);
      console.log(`[startup] Server ready to accept requests`);
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`[startup] ✗ Port ${PORT} is already in use`);
      } else {
        console.error("[startup] ✗ Server error:", error);
      }
    });

    // Graceful shutdown on SIGTERM
    process.on("SIGTERM", () => {
      console.log("[shutdown] SIGTERM received, closing gracefully...");
      server.close(() => {
        console.log("[shutdown] ✓ HTTP server closed");
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("[shutdown] Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    });

    // Graceful shutdown on SIGINT
    process.on("SIGINT", () => {
      console.log("[shutdown] SIGINT received, closing gracefully...");
      server.close(() => {
        console.log("[shutdown] ✓ HTTP server closed");
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error("[shutdown] Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    });

  } catch (error) {
    console.error("[startup] ✗ Critical startup failure:", error.message || error);
    console.error("[startup] Server cannot start without MongoDB connection");
    process.exit(1);
  }
};

startServer();

