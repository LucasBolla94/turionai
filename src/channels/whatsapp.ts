import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from "baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import pino from "pino";
import { resolve } from "node:path";
import { isAuthorized } from "../config/allowlist";
import { classifyMessage } from "../core/messagePipeline";
import { listScripts, runScript } from "../executor/executor";
import { createCron, listCrons, pauseCron, removeCron } from "../core/cronManager";
import os from "node:os";
import { interpretStrictJson } from "../core/brain";
import { executeActions } from "../core/actionExecutor";
import { getProject, upsertProject } from "../core/projectRegistry";

const authDir = resolve("state", "baileys");
const seenMessages = new Map<string, number>();
const SEEN_TTL_MS = 5 * 60 * 1000;

function markSeen(id: string): void {
  const now = Date.now();
  seenMessages.set(id, now);
  for (const [key, ts] of seenMessages) {
    if (now - ts > SEEN_TTL_MS) {
      seenMessages.delete(key);
    }
  }
}

function alreadySeen(id: string): boolean {
  const ts = seenMessages.get(id);
  if (!ts) return false;
  return Date.now() - ts <= SEEN_TTL_MS;
}

export async function initWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "info" }),
    getMessage: async () => undefined,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrText = await qrcode.toString(qr, { type: "terminal" });
      console.log(qrText);
      console.log("[Turion] escaneie o QR Code acima com o WhatsApp.");
    }

    if (connection === "open") {
      console.log("[Turion] WhatsApp conectado.");
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.warn("[Turion] WhatsApp desconectado.", {
        statusCode,
        shouldReconnect,
      });

      if (shouldReconnect) {
        await initWhatsApp();
      } else {
        console.warn("[Turion] Sessão encerrada. Remova state/baileys e reconecte.");
      }
    }
  });

  socket.ev.on("messages.upsert", (event) => {
    if (event.type !== "notify") {
      return;
    }
    for (const message of event.messages) {
      if (message.key.fromMe) {
        continue;
      }
      const messageId = message.key.id;
      if (messageId) {
        if (alreadySeen(messageId)) {
          continue;
        }
        markSeen(messageId);
      }
      const from = message.key.remoteJid ?? "unknown";
      const sender = message.key.participant ?? message.key.remoteJid ?? "unknown";
      const authorized = isAuthorized(sender) || isAuthorized(from);
      const text =
        message.message?.conversation ??
        message.message?.extendedTextMessage?.text ??
        "";
      if (!text.trim()) {
        continue;
      }
      if (!authorized) {
        console.warn(`[Turion] msg bloqueada`, { sender, from });
        continue;
      }
      const result = classifyMessage({
        text,
        from,
        sender,
        timestamp: Date.now(),
      });
      console.log(`[Turion] msg de ${from}: ${text}`);
      console.log(`[Turion] intent: ${result.intent}`, result);

      if (result.intent === "COMMAND") {
        handleCommand(socket, from, result.command ?? "", result.args ?? []).catch((error) => {
          console.error("[Turion] erro ao executar comando:", error);
        });
      } else {
        handleBrain(socket, from, text).catch((error) => {
          console.error("[Turion] erro no brain:", error);
        });
      }
    }
  });

  return socket;
}

async function handleCommand(
  socket: WASocket,
  to: string,
  command: string,
  args: string[],
): Promise<void> {
  const cmd = command.trim();
  if (!cmd) return;

  const deployScript =
    process.platform === "win32" ? "deploy_compose.ps1" : "deploy_compose.sh";

  if (cmd === "status") {
    const uptimeSec = Math.floor(process.uptime());
    const memory = process.memoryUsage();
    const response = [
      "Status",
      `- uptime: ${uptimeSec}s`,
      `- platform: ${process.platform} ${process.arch}`,
      `- hostname: ${os.hostname()}`,
      `- rss: ${Math.round(memory.rss / 1024 / 1024)} MB`,
    ].join("\n");
    await socket.sendMessage(to, { text: response });
    return;
  }

  if (cmd === "list" && args[0] === "scripts") {
    const scripts = await listScripts();
    const response = scripts.length
      ? `Scripts:\n${scripts.map((s) => `- ${s}`).join("\n")}`
      : "Nenhum script encontrado.";
    await socket.sendMessage(to, { text: response });
    return;
  }

  if (cmd === "run") {
    const scriptName = args[0];
    if (!scriptName) {
      await socket.sendMessage(to, { text: "Uso: run <script>" });
      return;
    }
    try {
      const output = await runScript(scriptName);
      await socket.sendMessage(to, { text: output || "Sem saída." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao executar script.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  if (cmd === "deploy") {
    const name = args[0];
    const repo = args[1];
    if (!name || !repo) {
      await socket.sendMessage(to, { text: "Uso: deploy <name> <repo_url>" });
      return;
    }
    try {
      const output = await runScript(deployScript, [name, repo]);
      await upsertProject({
        name,
        repo_url: repo,
        path:
          process.platform === "win32"
            ? `C:\\opt\\turion\\projects\\${name}`
            : `/opt/turion/projects/${name}`,
        deploy: "docker-compose",
        ports: [],
        domains: [],
        last_deploy_ts: new Date().toISOString(),
      });
      await socket.sendMessage(to, { text: output || "Deploy concluído." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no deploy.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  if (cmd === "redeploy") {
    const name = args[0];
    if (!name) {
      await socket.sendMessage(to, { text: "Uso: redeploy <name>" });
      return;
    }
    const project = await getProject(name);
    if (!project) {
      await socket.sendMessage(to, { text: "Projeto não encontrado." });
      return;
    }
    try {
      const output = await runScript(deployScript, [project.name, project.repo_url]);
      await upsertProject({
        ...project,
        last_deploy_ts: new Date().toISOString(),
      });
      await socket.sendMessage(to, { text: output || "Redeploy concluído." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no redeploy.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  if (cmd === "cron" && args[0] === "add") {
    const name = args[1];
    const schedule = args[2];
    const jobType = args[3];
    const payload = args.slice(4).join(" ");
    if (!name || !schedule || !jobType) {
      await socket.sendMessage(to, {
        text: "Uso: cron add <name> <schedule> <jobType> [payload]",
      });
      return;
    }
    try {
      const job = await createCron(name, schedule, jobType, payload);
      await socket.sendMessage(to, {
        text: `Cron criado: ${job.name} (${job.schedule})`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao criar cron.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  if (cmd === "cron" && args[0] === "list") {
    const jobs = await listCrons();
    const response = jobs.length
      ? `Crons:\n${jobs
          .map(
            (j) =>
              `- ${j.name} | ${j.schedule} | ${j.jobType} | ${j.enabled ? "ON" : "OFF"}`,
          )
          .join("\n")}`
      : "Nenhum cron configurado.";
    await socket.sendMessage(to, { text: response });
    return;
  }

  if (cmd === "cron" && args[0] === "pause") {
    const name = args[1];
    if (!name) {
      await socket.sendMessage(to, { text: "Uso: cron pause <name>" });
      return;
    }
    try {
      await pauseCron(name);
      await socket.sendMessage(to, { text: `Cron pausado: ${name}` });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao pausar cron.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  if (cmd === "cron" && args[0] === "remove") {
    const name = args[1];
    if (!name) {
      await socket.sendMessage(to, { text: "Uso: cron remove <name>" });
      return;
    }
    try {
      await removeCron(name);
      await socket.sendMessage(to, { text: `Cron removido: ${name}` });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao remover cron.";
      await socket.sendMessage(to, { text: `Erro: ${message}` });
    }
    return;
  }

  await socket.sendMessage(to, { text: "Comando não reconhecido." });
}

async function handleBrain(socket: WASocket, to: string, text: string): Promise<void> {
  try {
    const result = await interpretStrictJson(text);
    if (!result) {
      await socket.sendMessage(to, { text: "IA sem resposta válida." });
      return;
    }
    const responseLines = [
      `Intent: ${result.intent}`,
      `Args: ${JSON.stringify(result.args)}`,
      result.missing.length ? `Missing: ${result.missing.join(", ")}` : "Missing: none",
      `Needs confirmation: ${result.needs_confirmation}`,
    ];
    if (result.reply) {
      responseLines.push(`Reply: ${result.reply}`);
    }
    await socket.sendMessage(to, { text: responseLines.join("\n") });

    if (result.actions && result.actions.length > 0) {
      const outputs = await executeActions(result.actions);
      await socket.sendMessage(to, { text: outputs.join("\n") });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no interpretador.";
    await socket.sendMessage(to, { text: `Erro IA: ${message}` });
  }
}
