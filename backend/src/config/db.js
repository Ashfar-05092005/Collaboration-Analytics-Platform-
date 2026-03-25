const mongoose = require("mongoose");

// Disable mongoose buffering to prevent timeout issues
mongoose.set("bufferCommands", false);

// Add connection event listeners for debugging
mongoose.connection.on("connected", () => {
  console.log("[db] ✓ Connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("[db] Connection error:", err.message || err);
});

mongoose.connection.on("disconnected", () => {
  console.log("[db] Disconnected from MongoDB");
});

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const connectDB = async (attempt = 1) => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("[db] MONGO_URI environment variable is not set. Cannot proceed.");
  }

  try {
    console.log(`[db] Attempting to connect to MongoDB (attempt ${attempt}/${MAX_RETRIES})...`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      w: "majority",
    });
    
    console.log("[db] ✓ MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    console.error(`[db] Connection attempt ${attempt} failed:`, error.message || error);
    
    if (attempt < MAX_RETRIES) {
      console.log(`[db] Retrying in ${RETRY_DELAY}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return connectDB(attempt + 1);
    }
    
    console.error("[db] ✗ All connection attempts failed");
    throw error;
  }
};

module.exports = { connectDB };

