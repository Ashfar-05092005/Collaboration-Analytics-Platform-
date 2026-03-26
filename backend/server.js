const { startServer } = require("./src/app");

process.on("SIGTERM", () => {
  console.log("[shutdown] SIGTERM received");
});

process.on("SIGINT", () => {
  console.log("[shutdown] SIGINT received");
  process.exit(0);
});

startServer();
