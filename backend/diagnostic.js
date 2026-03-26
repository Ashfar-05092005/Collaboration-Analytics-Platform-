const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const mongoUri = String(process.env.MONGO_URI || "").trim().replace(/^['\"]|['\"]$/g, "");
const NODE_ENV = process.env.NODE_ENV || "development";

console.log("[diagnostic] Starting MongoDB connection test...");
console.log(`[diagnostic] ENV: ${NODE_ENV}`);
console.log(`[diagnostic] MongoDB URI: ${mongoUri.substring(0, 50)}...`);

mongoose.set("bufferCommands", false);

const test = async () => {
  try {
    console.log("[diagnostic] Attempting connection...");
    
    await mongoose.connect(mongoUri, {
      tls: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("[diagnostic] ✓ Connected to MongoDB Atlas");
    console.log(`[diagnostic] Connection state: ${mongoose.connection.readyState} (1 = connected)`);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n[diagnostic] Collections in database:");
    collections.forEach((col) => {
      console.log(`  - ${col.name}`);
    });

    // Try to query each collection
    console.log("\n[diagnostic] Testing queries on each collection:");
    for (const col of collections) {
      const name = col.name;
      try {
        const count = await mongoose.connection.db.collection(name).countDocuments();
        const sample = await mongoose.connection.db.collection(name).findOne();
        console.log(`  ${name}: ${count} documents ${sample ? "(sample found)" : "(empty)"}`);
      } catch (err) {
        console.error(`  ${name}: ERROR - ${err.message}`);
      }
    }

    // Test with models
    console.log("\n[diagnostic] Testing with Mongoose models:");
    const { User } = require("./src/models/User");
    const { Task } = require("./src/models/Task");
    const { Team } = require("./src/models/Team");
    const { Project } = require("./src/models/Project");

    const userCount = await User.countDocuments();
    const taskCount = await Task.countDocuments();
    const teamCount = await Team.countDocuments();
    const projectCount = await Project.countDocuments();

    console.log(`  Users: ${userCount}`);
    console.log(`  Tasks: ${taskCount}`);
    console.log(`  Teams: ${teamCount}`);
    console.log(`  Projects: ${projectCount}`);

    // Fetch a sample user
    if (userCount > 0) {
      const sampleUser = await User.findOne().select("-passwordHash").lean();
      console.log("\n[diagnostic] Sample user:");
      console.log(JSON.stringify(sampleUser, null, 2));
    } else {
      console.log("\n[diagnostic] ⚠ No users found. Are there any documents in MongoDB?");
    }

    console.log("\n[diagnostic] ✓ All tests passed");
  } catch (error) {
    console.error("[diagnostic] ✗ Error:", error.message);
    if (error.message.includes("ENOTFOUND")) {
      console.error("[diagnostic] Network issue: Cannot resolve hostname. Check internet and Atlas IP whitelist.");
    }
    if (error.message.includes("authentication failed")) {
      console.error("[diagnostic] Auth issue: Wrong username/password. Check MONGO_URI.");
    }
    if (error.message.includes("tls")) {
      console.error("[diagnostic] TLS issue: Check Atlas Network Access settings (IP whitelist).");
    }
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
      console.log("[diagnostic] Disconnected");
    }
    process.exit(error ? 1 : 0);
  }
};

test();
