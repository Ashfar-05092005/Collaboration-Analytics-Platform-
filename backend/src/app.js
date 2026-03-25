const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
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

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "").toLowerCase();

app.set("trust proxy", 1);

app.use(helmet());
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

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
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
  try {
    console.log("[startup] Starting backend server...");
    console.log("[startup] Connecting to MongoDB...");
    await connectDB();
    console.log("[startup] MongoDB connection successful");

    const server = app.listen(PORT, () => {
      console.log(`[startup] Backend running on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("[startup] Server failed to start:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("[startup] Critical startup failure:", error);
    console.error("[startup] Server cannot start without MongoDB connection. Exiting...");
    process.exit(1);
  }
};

startServer();

