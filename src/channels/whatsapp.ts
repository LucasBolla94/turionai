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
import { diagnoseLogs, interpretStrictJson } from "../core/brain";
import { executeActions } from "../core/actionExecutor";
import { getProject, upsertProject } from "../core/projectRegistry";
import { findSkillByIntent } from "../skills/registry";
import { runPlan } from "../core/planRunner";
import {
  appendConversation,
  appendDigest,
  readRecentConversation,
} from "../core/conversationStore";
import { summarizeConversation } from "../core/brain";

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
      const threadId = from.replace(/[^\w]/g, "_");
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
      appendConversation({
        ts: new Date().toISOString(),
        from: sender,
        thread: threadId,
        direction: "in",
        text,
      }).catch(() => undefined);
      console.log(`[Turion] msg de ${from}: ${text}`);
      console.log(`[Turion] intent: ${result.intent}`, result);

      if (result.intent === "COMMAND") {
        handleCommand(socket, from, threadId, result.command ?? "", result.args ?? []).catch(
          (error) => {
          console.error("[Turion] erro ao executar comando:", error);
        },
        );
      } else {
        handleBrain(socket, from, threadId, text).catch((error) => {
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
  threadId: string,
  command: string,
  args: string[],
): Promise<void> {
  const cmd = command.trim();
  if (!cmd) return;

  const deployScript =
    process.platform === "win32" ? "deploy_compose.ps1" : "deploy_compose.sh";
  const logsScript =
    process.platform === "win32" ? "logs_compose.ps1" : "logs_compose.sh";

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
    await sendAndLog(socket, to, threadId, response);
    return;
  }

  if (cmd === "list" && args[0] === "scripts") {
    const scripts = await listScripts();
    const response = scripts.length
      ? `Scripts:\n${scripts.map((s) => `- ${s}`).join("\n")}`
      : "Nenhum script encontrado.";
    await sendAndLog(socket, to, threadId, response);
    return;
  }

  if (cmd === "run") {
    const scriptName = args[0];
    if (!scriptName) {
      await sendAndLog(socket, to, threadId, "Uso: run <script>");
      return;
    }
    try {
      const output = await runScript(scriptName);
      await sendAndLog(socket, to, threadId, output || "Sem saída.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao executar script.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "deploy") {
    const name = args[0];
    const repo = args[1];
    if (!name || !repo) {
      await sendAndLog(socket, to, threadId, "Uso: deploy <name> <repo_url>");
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
      await sendAndLog(socket, to, threadId, output || "Deploy concluído.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no deploy.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "redeploy") {
    const name = args[0];
    if (!name) {
      await sendAndLog(socket, to, threadId, "Uso: redeploy <name>");
      return;
    }
    const project = await getProject(name);
    if (!project) {
      await sendAndLog(socket, to, threadId, "Projeto não encontrado.");
      return;
    }
    try {
      const output = await runScript(deployScript, [project.name, project.repo_url]);
      await upsertProject({
        ...project,
        last_deploy_ts: new Date().toISOString(),
      });
      await sendAndLog(socket, to, threadId, output || "Redeploy concluído.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no redeploy.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "cron" && args[0] === "add") {
    const name = args[1];
    const schedule = args[2];
    const jobType = args[3];
    const payload = args.slice(4).join(" ");
    if (!name || !schedule || !jobType) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Uso: cron add <name> <schedule> <jobType> [payload]",
      );
      return;
    }
    try {
      const job = await createCron(name, schedule, jobType, payload);
      await sendAndLog(socket, to, threadId, `Cron criado: ${job.name} (${job.schedule})`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao criar cron.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
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
    await sendAndLog(socket, to, threadId, response);
    return;
  }

  if (cmd === "cron" && args[0] === "pause") {
    const name = args[1];
    if (!name) {
      await sendAndLog(socket, to, threadId, "Uso: cron pause <name>");
      return;
    }
    try {
      await pauseCron(name);
      await sendAndLog(socket, to, threadId, `Cron pausado: ${name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao pausar cron.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "cron" && args[0] === "remove") {
    const name = args[1];
    if (!name) {
      await sendAndLog(socket, to, threadId, "Uso: cron remove <name>");
      return;
    }
    try {
      await removeCron(name);
      await sendAndLog(socket, to, threadId, `Cron removido: ${name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao remover cron.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "logs") {
    const name = args[0];
    const lines = args[1] ?? "200";
    if (!name) {
      await sendAndLog(socket, to, threadId, "Uso: logs <name> [lines]");
      return;
    }
    try {
      const output = await runScript(logsScript, [name, lines]);
      await sendAndLog(socket, to, threadId, truncateLogs(output));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao buscar logs.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "diagnose") {
    const name = args[0];
    const lines = args[1] ?? "200";
    if (!name) {
      await sendAndLog(socket, to, threadId, "Uso: diagnose <name> [lines]");
      return;
    }
    try {
      const output = await runScript(logsScript, [name, lines]);
      const trimmed = truncateLogs(output);
      const result = await diagnoseLogs(trimmed);
      if (!result) {
        await sendAndLog(socket, to, threadId, "Diagnóstico indisponível.");
        return;
      }
      const response = [
        `Resumo: ${result.summary}`,
        `Causa provável: ${result.probable_cause}`,
        `Precisa confirmação: ${result.needs_confirmation}`,
        `Próximos passos: ${result.safe_next_steps
          .map((s) => `${s.skill} ${JSON.stringify(s.args)}`)
          .join("; ")}`,
      ].join("\n");
      await sendAndLog(socket, to, threadId, response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha no diagnóstico.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "update") {
    const updateScript =
      process.platform === "win32" ? "update_self.ps1" : "update_self.sh";
    try {
      const output = await runScript(updateScript);
      await sendAndLog(socket, to, threadId, `${output}\nReiniciando...`);
      setTimeout(() => process.exit(0), 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na atualização.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  await sendAndLog(socket, to, threadId, "Comando não reconhecido.");
}

function truncateLogs(input: string): string {
  const maxChars = 20_000;
  const lines = input.split(/\r?\n/);
  const deduped: string[] = [];
  let last = "";
  for (const line of lines) {
    if (line === last) continue;
    deduped.push(line);
    last = line;
  }
  const joined = deduped.join("\n");
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars)}\n...[truncado]`;
}

async function handleBrain(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
): Promise<void> {
  try {
    const result = await interpretStrictJson(text);
    if (!result) {
      await sendAndLog(socket, to, threadId, "IA sem resposta válida.");
      return;
    }
    if (result.reply) {
      await sendAndLog(socket, to, threadId, result.reply);
    } else {
      const responseLines = [
        `Intent: ${result.intent}`,
        `Args: ${JSON.stringify(result.args)}`,
        result.missing.length ? `Missing: ${result.missing.join(", ")}` : "Missing: none",
        `Needs confirmation: ${result.needs_confirmation}`,
      ];
      await sendAndLog(socket, to, threadId, responseLines.join("\n"));
    }

    if (result.action === "RUN_PLAN" && Array.isArray(result.plan)) {
      if (result.needs_confirmation) {
        return;
      }
      const outputs = await runPlan(result.plan, { platform: process.platform });
      if (outputs.length > 0) {
        await sendAndLog(socket, to, threadId, outputs.join("\n"));
      }
      return;
    }

    if (result.action === "RUN_SKILL") {
      const skill = findSkillByIntent(result.intent);
      if (!skill) {
        await socket.sendMessage(to, { text: "Skill não encontrada." });
        return;
      }
      const outcome = await skill.execute(result.args ?? {}, { platform: process.platform });
      await sendAndLog(socket, to, threadId, outcome.output);
      return;
    }

    if (result.actions && result.actions.length > 0) {
      const outputs = await executeActions(result.actions);
      await sendAndLog(socket, to, threadId, outputs.join("\n"));
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no interpretador.";
    await sendAndLog(socket, to, threadId, `Erro IA: ${message}`);
  }
}

async function sendAndLog(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
): Promise<void> {
  await socket.sendMessage(to, { text });
  await appendConversation({
    ts: new Date().toISOString(),
    from: "Tur",
    thread: threadId,
    direction: "out",
    text,
  });

  await maybeDigest(threadId);
}

const threadCounters = new Map<string, number>();

async function maybeDigest(threadId: string): Promise<void> {
  const current = threadCounters.get(threadId) ?? 0;
  const next = current + 1;
  threadCounters.set(threadId, next);
  if (next % 10 !== 0) return;

  const recent = await readRecentConversation(threadId, 20);
  if (recent.length === 0) return;
  const summary = await summarizeConversation(recent.join("\n"));
  if (!summary) return;
  await appendDigest(threadId, summary);
}
