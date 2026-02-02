#!/usr/bin/env node
import { runSetupWizard } from "./wizard.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printHelp();
    process.exit(0);
  }

  if (command === "setup") {
    await runSetupWizard();
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp(): void {
  console.log("AgentTUR CLI");
  console.log("Usage:");
  console.log("  turion setup   Start interactive setup wizard");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
