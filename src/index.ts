import { setInterval } from "node:timers";
import { initWhatsApp } from "./channels/whatsapp";

function main(): void {
  const startedAt = new Date().toISOString();
  console.log(`[Turion] iniciado em ${startedAt}`);

  initWhatsApp().catch((error) => {
    console.error("[Turion] falha ao iniciar WhatsApp:", error);
  });

  // Keep the process alive with a no-op heartbeat.
  setInterval(() => {
    // Intentionally empty: we only need the event loop alive.
  }, 60_000);
}

main();
