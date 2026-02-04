import "./core/env";
import { setInterval } from "node:timers";
import { initWhatsApp } from "./channels/whatsapp";
import { initCronManager } from "./core/cronManager";

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[Turion] iniciado em ${startedAt}`);

  try {
    await initWhatsApp();
  } catch (error) {
    console.error("[Turion] falha ao iniciar WhatsApp:", error);
  }

  initCronManager().catch((error) => {
    console.error("[Turion] falha ao iniciar CronManager:", error);
  });

  // Keep the process alive with a no-op heartbeat.
  setInterval(() => {
    // Intentionally empty: we only need the event loop alive.
  }, 60_000);
}

main().catch((error) => {
  console.error("[Turion] falha ao iniciar:", error);
});
