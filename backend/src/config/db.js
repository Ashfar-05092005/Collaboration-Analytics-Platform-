const mongoose = require("mongoose");
const { env } = require("./env");

mongoose.set("bufferCommands", false);

let handlersAttached = false;
let isConnecting = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const attachHandlers = () => {
  if (handlersAttached) return;

  mongoose.connection.on("connected", () => {
    console.log("[db] MongoDB connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message || err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected. Retrying in 5000ms...");
    setTimeout(() => {
      connectDB();
    }, 5000);
  });

  handlersAttached = true;
};

const sanitizeMongoUri = (rawUri) => {
  const uri = String(rawUri || "").trim().replace(/^['\"]|['\"]$/g, "");
  return uri;
};

const logAtlasTroubleshooting = () => {
  console.warn("[db] Atlas checks: verify URI format mongodb+srv://..., correct DB user credentials, and Atlas IP access 0.0.0.0/0 for Render.");
};

const connectOnce = async () => {
  if (!env.MONGO_URI) {
    console.warn("[db] MONGO_URI is missing. Running without database connection.");
    return false;
  }

  if (mongoose.connection.readyState === 1 || isConnecting) {
    return true;
  }

  attachHandlers();

  isConnecting = true;

  const mongoUri = sanitizeMongoUri(process.env.MONGO_URI);

  if (!mongoUri.startsWith("mongodb+srv://") && !mongoUri.startsWith("mongodb://")) {
    console.warn("[db] MONGO_URI looks invalid. Expected mongodb+srv://... or mongodb://...");
  }

  try {
    await mongoose.connect(mongoUri, {
      tls: true,
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
    });

    console.log("[db] MongoDB connected");

    console.log("[db] Database connection established");
    return true;
  } catch (error) {
    console.error("[db] Database connection failed:", error.message || error);

    if (String(error.message || "").toLowerCase().includes("ssl") || String(error.message || "").toLowerCase().includes("tls")) {
      console.error("[db] MongoNetworkError detected (SSL/TLS). Check Atlas Network Access and TLS settings.");
      logAtlasTroubleshooting();
    }

    return false;
  } finally {
    isConnecting = false;
  }
};

const connectDB = async () => {
  const maxRetries = Number(process.env.MONGO_MAX_RETRIES || 10);
  const retryDelayMs = Number(process.env.MONGO_RETRY_DELAY_MS || 5000);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const connected = await connectOnce();
    if (connected) return true;

    console.warn(`[db] Retry ${attempt}/${maxRetries} failed. Retrying in ${retryDelayMs}ms...`);
    await wait(retryDelayMs);
  }

  console.error("[db] Could not establish MongoDB connection after retries.");
  return false;
};

module.exports = { connectDB };

