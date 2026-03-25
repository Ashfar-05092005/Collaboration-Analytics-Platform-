const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn("[db] MONGO_URI is missing. Database connection skipped.");
    return null;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("[db] MongoDB connected");
    return mongoose.connection;
  } catch (error) {
    console.error("[db] MongoDB connection failed:", error.message || error);
    return null;
  }
};

module.exports = { connectDB };

