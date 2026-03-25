const requiredMajor = 20;
const currentVersion = process.versions.node;
const currentMajor = Number.parseInt(currentVersion.split(".")[0], 10);

if (currentMajor !== requiredMajor) {
  console.error("\n[Node Version Check] Unsupported Node.js version detected.");
  console.error(`Required: Node.js ${requiredMajor}.x`);
  console.error(`Current : Node.js ${currentVersion}\n`);
  console.error("Please switch to Node 20 before running this command.");
  console.error("If you use nvm-windows:");
  console.error("  nvm install 20.18.3");
  console.error("  nvm use 20.18.3\n");
  process.exit(1);
}
