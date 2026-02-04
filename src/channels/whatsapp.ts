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
import {
  addMemoryItem,
  buildMemoryContext,
  searchMemoryByKeywords,
} from "../core/memoryStore";
import { getCurrentTimeString, setTimezone } from "../core/timezone";
import { registerCronHandler } from "../core/cronManager";
import { readLatestDigest } from "../core/conversationStore";
import { getTimezone } from "../core/timezone";
import { EmailSkill } from "../skills/emailSkill";
import { clearPending, getPending, setPending } from "../core/pendingActions";

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
      console.log("[Tur] Novo QR Code gerado. Use imediatamente.");
      const qrText = await qrcode.toString(qr, { type: "terminal" });
      console.log(qrText);
      console.log("[Tur] Escaneie o QR Code acima com o WhatsApp.");
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
      const sanitizedText = sanitizeConversationText(text);
      if (!authorized) {
        console.warn(`[Turion] msg bloqueada`, { sender, from });
        continue;
      }
      const pending = await getPending(threadId);
      const decision = parseConfirmation(text);
      if (pending && decision) {
        await handlePendingDecision(socket, to, threadId, pending, decision);
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
        text: sanitizedText,
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

  registerCronHandler("reminder", async (job) => {
    const payload = safeJson<{ to?: string; message?: string }>(job.payload);
    const messageText = payload?.message ?? "Lembrete";
    const to = payload?.to ?? "";
    if (!to) return;
    await socket.sendMessage(to, { text: `⏰ Lembrete: ${messageText}` });
    await appendConversation({
      ts: new Date().toISOString(),
      from: "Tur",
      thread: to.replace(/[^\w]/g, "_"),
      direction: "out",
      text: `⏰ Lembrete: ${messageText}`,
    });
  });

  registerCronHandler("email_monitor", async (job) => {
    const payload = safeJson<{ to?: string; unreadOnly?: boolean; limit?: number }>(
      job.payload,
    );
    const to = payload?.to ?? "";
    if (!to) return;
    const emailSkill = new EmailSkill();
    const unreadOnly = payload?.unreadOnly !== false;
    const result = await emailSkill.execute(
      { action: "list", limit: payload?.limit ?? 5, unreadOnly },
      { platform: process.platform },
    );
    if (!result.ok) {
      await socket.sendMessage(to, { text: `Erro ao checar emails: ${result.output}` });
      return;
    }
    await socket.sendMessage(to, { text: result.output });
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

  if (cmd === "time") {
    const time = await getCurrentTimeString();
    await sendAndLog(socket, to, threadId, `Agora são ${time}.`);
    return;
  }

  if (cmd === "timezone") {
    const tz = args[0];
    if (!tz) {
      await sendAndLog(socket, to, threadId, "Uso: timezone <Region/City>");
      return;
    }
    try {
      await setTimezone(tz);
      const time = await getCurrentTimeString();
      await sendAndLog(socket, to, threadId, `Fuso horário atualizado: ${tz}. Agora são ${time}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fuso horário inválido.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }

  if (cmd === "email") {
    const action = args[0];
    const emailSkill = new EmailSkill();
    if (!action) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Uso: email connect|list|read|reply|delete ...",
      );
      return;
    }
    const payload = parseEmailCommandArgs(action, args.slice(1));
    const result = await emailSkill.execute(payload, { platform: process.platform });
    await sendAndLog(socket, to, threadId, result.output);
    return;
  }

  if (cmd === "memory" || cmd === "mem") {
    const action = args[0];
    if (!action) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Uso: memory add <fact|decision|preference|task> <texto> | memory search <keywords>",
      );
      return;
    }
    if (action === "add") {
      const type = args[1] as "fact" | "decision" | "preference" | "task" | undefined;
      const textValue = args.slice(2).join(" ");
      if (!type || !textValue) {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Uso: memory add <fact|decision|preference|task> <texto>",
        );
        return;
      }
      const item = await addMemoryItem(type, textValue);
      await sendAndLog(socket, to, threadId, `Memoria salva: ${item.id}`);
      return;
    }
    if (action === "search") {
      const keywords = args.slice(1);
      if (keywords.length === 0) {
        await sendAndLog(socket, to, threadId, "Uso: memory search <keywords>");
        return;
      }
      const results = await searchMemoryByKeywords(keywords, 6);
      if (results.length === 0) {
        await sendAndLog(socket, to, threadId, "Nenhuma memoria encontrada.");
        return;
      }
      const response = results
        .map((item) => {
          if ("name" in item) {
            return `- [project] ${item.name} | ${item.repo_url}`;
          }
          return `- [${item.type}] ${item.text}`;
        })
        .join("\n");
      await sendAndLog(socket, to, threadId, `Memorias:\n${response}`);
      return;
    }
    await sendAndLog(socket, to, threadId, "Ação desconhecida. Use add ou search.");
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
    const timeIntent = parseTimeRequest(text);
    if (timeIntent) {
      const time = await getCurrentTimeString();
      await sendAndLog(socket, to, threadId, `Agora são ${time}.`);
      return;
    }

    const timeZoneRequest = parseTimezoneRequest(text);
    if (timeZoneRequest) {
      try {
        await setTimezone(timeZoneRequest.timeZone);
        const time = await getCurrentTimeString();
        await sendAndLog(
          socket,
          to,
          threadId,
          `Fuso horário atualizado para ${timeZoneRequest.label}. Agora são ${time}.`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Fuso horário inválido.";
        await sendAndLog(socket, to, threadId, `Erro: ${message}`);
      }
      return;
    }

    const [memoryContext, recent, digest, timezone] = await Promise.all([
      buildMemoryContext(text),
      readRecentConversation(threadId, 5),
      readLatestDigest(threadId),
      getTimezone(),
    ]);
    const now = new Date().toISOString();
    const parts: string[] = [];
    parts.push(`Agora: ${now} (${timezone})`);
    if (digest) parts.push(`Resumo da thread: ${digest}`);
    if (recent.length) parts.push(`Ultimas mensagens:\n${recent.join("\n")}`);
    if (memoryContext) parts.push(memoryContext);
    parts.push(`Mensagem: ${text}`);
    const input = parts.join("\n");
    const result = await interpretStrictJson(input);
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

    if (result.needs_confirmation && (result.action === "RUN_PLAN" || result.action === "RUN_SKILL")) {
      if (result.action === "RUN_PLAN" && Array.isArray(result.plan)) {
        await setPending(threadId, {
          type: "RUN_PLAN",
          plan: result.plan,
          createdAt: new Date().toISOString(),
        });
        await sendAndLog(
          socket,
          to,
          threadId,
          "Confirma? Responda 'confirmar' ou 'cancelar'.",
        );
        return;
      }
      if (result.action === "RUN_SKILL") {
        await setPending(threadId, {
          type: "RUN_SKILL",
          intent: result.intent,
          args: result.args ?? {},
          createdAt: new Date().toISOString(),
        });
        await sendAndLog(
          socket,
          to,
          threadId,
          "Confirma? Responda 'confirmar' ou 'cancelar'.",
        );
        return;
      }
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
      if (result.intent === "CRON_CREATE") {
        const args = result.args ?? {};
        const jobType = typeof args.jobType === "string" ? args.jobType : "";
        if (jobType === "reminder") {
          const message =
            typeof args.message === "string"
              ? args.message
              : typeof args.payload === "string"
                ? args.payload
                : "";
          const name =
            typeof args.name === "string" && args.name.length > 0
              ? args.name
              : `reminder_${Date.now()}`;
          const schedule = typeof args.schedule === "string" ? args.schedule : "";
          const timezone = await getTimezone();
          result.args = {
            action: "create",
            name,
            schedule,
            jobType: "reminder",
            payload: JSON.stringify({ to, message }),
            runOnce: true,
            timezone,
          };
        }
        if (jobType === "email_monitor") {
          const schedule = typeof args.schedule === "string" ? args.schedule : "";
          const limit = typeof args.limit === "number" ? args.limit : 5;
          const unreadOnly =
            typeof args.unreadOnly === "boolean" ? args.unreadOnly : true;
          const timezone = await getTimezone();
          const name =
            typeof args.name === "string" && args.name.length > 0
              ? args.name
              : `email_monitor_${Date.now()}`;
          result.args = {
            action: "create",
            name,
            schedule,
            jobType: "email_monitor",
            payload: JSON.stringify({ to, unreadOnly, limit }),
            runOnce: false,
            timezone,
          };
        }
      }
      if (result.intent.startsWith("EMAIL_")) {
        if (result.intent === "EMAIL_REPLY") {
          const args = result.args ?? {};
          const id = typeof args.id === "number" ? args.id : Number(args.id);
          const body = typeof args.body === "string" ? args.body : "";
          const instruction =
            typeof args.instruction === "string" ? args.instruction : "";
          if (!id) {
            await sendAndLog(socket, to, threadId, "Informe o ID do email.");
            return;
          }
          if (!body && instruction) {
            const emailSkill = new EmailSkill();
            const draftResult = await emailSkill.execute(
              { action: "draft_reply", id, instruction },
              { platform: process.platform },
            );
            if (!draftResult.ok) {
              await sendAndLog(socket, to, threadId, draftResult.output);
              return;
            }
            await sendAndLog(
              socket,
              to,
              threadId,
              `Rascunho:\n${draftResult.output}\n\nConfirma envio? Responda 'confirmar' ou 'cancelar'.`,
            );
            await setPending(threadId, {
              type: "RUN_SKILL",
              intent: "EMAIL_REPLY",
              args: { action: "reply", id, body: draftResult.output },
              createdAt: new Date().toISOString(),
            });
            return;
          }
          if (!body) {
            await sendAndLog(socket, to, threadId, "O que devo responder?");
            return;
          }
        }
        result.args = normalizeEmailArgs(result.intent, result.args ?? {});
      }
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

function safeJson<T = Record<string, unknown>>(payload: string): T | null {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

function sanitizeConversationText(text: string): string {
  const lowered = text.toLowerCase();
  const sensitiveHints = ["app password", "senha", "password", "email connect"];
  if (sensitiveHints.some((hint) => lowered.includes(hint))) {
    return "[redacted]";
  }
  return text;
}

function parseEmailCommandArgs(action: string, rest: string[]): Record<string, unknown> {
  if (action === "connect") {
    return {
      action: "connect",
      provider: rest[0],
      user: rest[1],
      password: rest.slice(2).join(" "),
    };
  }
  if (action === "list") {
    const limit = rest[0] ? Number(rest[0]) : 5;
    return { action: "list", limit, unreadOnly: true };
  }
  if (action === "read") {
    return { action: "read", id: Number(rest[0]) };
  }
  if (action === "reply") {
    return { action: "reply", id: Number(rest[0]), body: rest.slice(1).join(" ") };
  }
  if (action === "explain") {
    return { action: "explain", id: Number(rest[0]) };
  }
  if (action === "draft") {
    return { action: "draft_reply", id: Number(rest[0]), instruction: rest.slice(1).join(" ") };
  }
  if (action === "delete") {
    return { action: "delete", id: Number(rest[0]) };
  }
  if (action === "monitor") {
    return { action: "monitor" };
  }
  return { action };
}

function parseConfirmation(text: string): "confirm" | "cancel" | null {
  const normalized = text.trim().toLowerCase();
  const confirm = new Set(["confirmar", "sim", "ok", "confirmo"]);
  const cancel = new Set(["cancelar", "nao", "não", "cancela"]);
  if (confirm.has(normalized)) return "confirm";
  if (cancel.has(normalized)) return "cancel";
  return null;
}

async function handlePendingDecision(
  socket: WASocket,
  to: string,
  threadId: string,
  pending: { type: "RUN_SKILL"; intent: string; args: Record<string, unknown> } | { type: "RUN_PLAN"; plan: Array<{ skill: string; args: Record<string, unknown> }> },
  decision: "confirm" | "cancel",
): Promise<void> {
  if (decision === "cancel") {
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, "Cancelado.");
    return;
  }
  if (pending.type === "RUN_PLAN") {
    const outputs = await runPlan(pending.plan, { platform: process.platform });
    await clearPending(threadId);
    if (outputs.length > 0) {
      await sendAndLog(socket, to, threadId, outputs.join("\n"));
    } else {
      await sendAndLog(socket, to, threadId, "Plano executado.");
    }
    return;
  }
  const skill = findSkillByIntent(pending.intent);
  if (!skill) {
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, "Skill não encontrada.");
    return;
  }
  const outcome = await skill.execute(pending.args ?? {}, { platform: process.platform });
  await clearPending(threadId);
  await sendAndLog(socket, to, threadId, outcome.output);
}

function normalizeEmailArgs(
  intent: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const actionMap: Record<string, string> = {
    EMAIL_CONNECT: "connect",
    EMAIL_LIST: "list",
    EMAIL_READ: "read",
    EMAIL_REPLY: "reply",
    EMAIL_DELETE: "delete",
    EMAIL_EXPLAIN: "explain",
    EMAIL_DRAFT: "draft_reply",
  };
  return {
    action: actionMap[intent] ?? args.action,
    ...args,
  };
}

function parseTimeRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("que horas") ||
    normalized.includes("horas são") ||
    normalized.includes("hora são") ||
    normalized.includes("hora agora") ||
    normalized === "hora" ||
    normalized === "horas"
  );
}

function parseTimezoneRequest(
  text: string,
): { timeZone: string; label: string } | null {
  const normalized = text.toLowerCase();
  if (!/(fuso|hor[aá]rio|timezone)/.test(normalized)) {
    return null;
  }

  const match = normalized.match(/(?:hor[aá]rio|fuso|timezone)\s+(?:de\s+)?(.+)$/);
  const raw = match?.[1]?.trim();

  const city = raw || normalized;
  const mapping: Record<string, { timeZone: string; label: string }> = {
    londres: { timeZone: "Europe/London", label: "Londres (Europe/London)" },
    london: { timeZone: "Europe/London", label: "Londres (Europe/London)" },
    lisboa: { timeZone: "Europe/Lisbon", label: "Lisboa (Europe/Lisbon)" },
    lisbon: { timeZone: "Europe/Lisbon", label: "Lisboa (Europe/Lisbon)" },
    "sao paulo": { timeZone: "America/Sao_Paulo", label: "São Paulo (America/Sao_Paulo)" },
    "são paulo": { timeZone: "America/Sao_Paulo", label: "São Paulo (America/Sao_Paulo)" },
    brasilia: { timeZone: "America/Sao_Paulo", label: "Brasília (America/Sao_Paulo)" },
    "rio de janeiro": { timeZone: "America/Sao_Paulo", label: "Rio de Janeiro (America/Sao_Paulo)" },
    portugal: { timeZone: "Europe/Lisbon", label: "Portugal (Europe/Lisbon)" },
    uk: { timeZone: "Europe/London", label: "Reino Unido (Europe/London)" },
    "reino unido": { timeZone: "Europe/London", label: "Reino Unido (Europe/London)" },
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (city.includes(key)) {
      return value;
    }
  }

  if (raw && raw.includes("/")) {
    return { timeZone: raw.trim(), label: raw.trim() };
  }

  return null;
}
