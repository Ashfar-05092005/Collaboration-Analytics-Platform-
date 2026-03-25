const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

const MAX_RETRIES = Number(process.env.MONGO_MAX_RETRIES || 5);
const BASE_RETRY_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 2000);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;

  mongoose.connection.on("connected", () => {
    console.log("[db] Connected to MongoDB");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB error:", err.message || err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });

  listenersAttached = true;
};

const getMongooseOptions = () => ({
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
  serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
  connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
  socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
  heartbeatFrequencyMS: Number(process.env.MONGO_HEARTBEAT_FREQUENCY_MS || 10000),
  retryWrites: true,
});

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("[db] MONGO_URI is missing.");
  }

  attachConnectionListeners();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      console.log(`[db] Connecting to MongoDB (attempt ${attempt}/${MAX_RETRIES})`);

      await mongoose.connect(mongoUri, getMongooseOptions());

      console.log("[db] MongoDB connection established");
      return mongoose.connection;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      console.error(`[db] Connection attempt ${attempt} failed:`, error.message || error);

      if (isLastAttempt) {
        console.error("[db] Exhausted MongoDB connection retries");
        throw error;
      }

      const backoffMs = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
      console.log(`[db] Retrying in ${backoffMs}ms`);
      await wait(backoffMs);
    }
  }

  throw new Error("[db] Unexpected MongoDB connection flow error.");
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[db] MongoDB connection closed");
  }
};

module.exports = { connectDB, disconnectDB };

