import { loadEnv } from "./config/env.js";
import { AuditLogger } from "./audit/auditLogger.js";
import { ToolRegistry } from "./core/toolRegistry.js";
import { Router } from "./core/router.js";
import { shellTool } from "./tools/shell.js";
import { startWhatsAppChannel } from "./channels/whatsapp/index.js";
import { startTuiChannel } from "./channels/tui/index.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = new AuditLogger(env.auditLogPath);
  const registry = new ToolRegistry();
  registry.register(shellTool);

  const router = new Router(registry, logger, env.authNumbers);

  if (env.enableWhatsapp) {
    await startWhatsAppChannel(router, env.waAuthDir, env.authNumbers);
  }

  if (env.enableTui) {
    await startTuiChannel(router);
  }
}

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

bootstrap().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
