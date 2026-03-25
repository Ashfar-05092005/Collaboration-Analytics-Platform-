const { app, env } = require("./app");
const { connectDB, disconnectDB } = require("./config/db");

const PORT = Number(process.env.PORT || env.PORT || 5000);

let server;
let shuttingDown = false;

const closeServer = () =>
  new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[shutdown] Received ${signal}. Closing server...`);

  const forceExitTimer = setTimeout(() => {
    console.error("[shutdown] Force exit after timeout");
    process.exit(1);
  }, 15000);

  try {
    await closeServer();
    console.log("[shutdown] HTTP server closed");
    await disconnectDB();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error("[shutdown] Error during shutdown:", error.message || error);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    console.log("[startup] Booting backend");
    console.log(`[startup] Environment: ${env.NODE_ENV}`);

    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`[startup] Backend listening on port ${PORT}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`[startup] Port ${PORT} is already in use`);
      } else {
        console.error("[startup] HTTP server error:", error.message || error);
      }
    });
  } catch (error) {
    console.error("[startup] Startup failed:", error.message || error);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled rejection:", reason);
});

startServer();
