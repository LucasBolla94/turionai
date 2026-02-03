import { setInterval } from "node:timers";

function main(): void {
  const startedAt = new Date().toISOString();
  console.log(`[Turion] iniciado em ${startedAt}`);

  // Keep the process alive with a no-op heartbeat.
  setInterval(() => {
    // Intentionally empty: we only need the event loop alive.
  }, 60_000);
}

main();
