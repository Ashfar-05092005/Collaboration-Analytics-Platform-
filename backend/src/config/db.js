const mongoose = require("mongoose");

// Disable mongoose buffering to prevent timeout issues
mongoose.set("bufferCommands", false);

// Add connection event listeners for debugging
mongoose.connection.on("connected", () => {
  console.log("[db] DB connected");
});

mongoose.connection.on("error", (err) => {
  console.error("[db] DB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("[db] DB disconnected");
});

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("[db] MONGO_URI environment variable is not set. Cannot proceed.");
  }

  try {
    console.log("[db] Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log("[db] MongoDB Connected Successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("[db] MongoDB Connection Failed:", error.message || error);
    throw error;
  }
};

module.exports = { connectDB };

