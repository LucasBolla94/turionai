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
import { statfsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { isAuthorized } from "../../config/allowlist";
import { classifyMessage } from "../../core/messagePipeline";
import { listScripts, runScript } from "../../executor/executor";
import { createCron, createCronNormalized, listCrons, pauseCron, removeCron } from "../../core/cronManager";
import os from "node:os";
import {
  diagnoseLogs,
  explainEmailSecurity,
  interpretOnboardingAnswer,
  interpretStrictJson,
} from "../../core/brain";
import { executeActions } from "../../core/actionExecutor";
import { getProject, upsertProject } from "../../core/projectRegistry";
import { findSkillByIntent } from "../../skills/registry";
import { runPlan } from "../../core/planRunner";
import {
  appendConversation,
  appendDigest,
  readRecentConversation,
} from "../../core/conversationStore";
import { summarizeConversation } from "../../core/brain";
import {
  addMemoryItem,
  buildMemoryContext,
  searchMemoryByKeywords,
} from "../../core/memoryStore";
import {
  getCurrentTimeString,
  inferTimezoneFromLocation,
  normalizeTimezoneInput,
  setTimezone,
} from "../../core/timezone";
import { registerCronHandler } from "../../core/cronManager";
import { readLatestDigest } from "../../core/conversationStore";
import { getTimezone } from "../../core/timezone";
import { EmailSkill } from "../../skills/emailSkill";
import { processBrainMessage } from "../../brain/migrationWrapper";
import { clearPending, getPending, setPending } from "../../core/pendingActions";
import { loadEmailConfig } from "../../core/emailStore";

import { consumeUpdatePending, hasUpdatePending, markUpdatePending } from "../../core/updateStatus";
import { addEmailRule, extractEmailDomain } from "../../core/emailRules";
import { loadEmailSnapshot } from "../../core/emailSnapshot";
import { applyFeedback, setBehaviorProfile, touchEmotionState } from "../../core/behavior";
import { polishReply, syncStyleFromBehavior } from "../../core/ux/HumanReply";
import { recordInteraction, getInteractionState, markCheckinSent, setLastTopic } from "../../core/interaction";
import { updatePreferencesFromMessage } from "../../core/preferences";
import { updateRouterFromMessage } from "../../core/responseRouter";
import { ensurePairingCode, getOwnerState, setOwner, updateOwnerDetails } from "../../core/owner";
import { runSilentStudy } from "../../core/studyEngine";


import {
  normalizeJid,
  isLikelyXaiKey,
  extractAnthropicKey,
  isLikelyAnthropicKey,
  userMentionsEmail,
  isRecentTimestamp,
  stripEmailContent,
  sameOwner,
  extractQuotedText,
  safeJson,
  sanitizeConversationText,
  extractEmail,
  enforceResponseStructure,
  truncateLogs,
  extractCleanupSuggestion,
  buildPromoListMessage,
  buildEmailDeletePrompt,
  buildEmailPickPrompt,
  resolveEmailDeleteTargets,
  normalizeEmailArgs,
} from "./utils";

import {
  parseRelativeReminder,
  parseLocation,
  parseConfirmation,
  parseUpdateRequest,
  parseUpdateStatusRequest,
  parseModelUpdateQuestion,
  buildModelUpdateExplanation,
  parseApiStatusRequest,
  parseUpdateCheckRequest,
  parseGitStatusRequest,
  parseEmailStatusRequest,
  parseEmailAccessQuestion,
  parseEmailConnectRequest,
  parseEmailSecurityQuestion,
  parseEmailProvider,
  parseEmailPromoRequest,
  parseRetryRequest,
  isEmailListFollowup,
  parseTimeRequest,
  parseTimezoneRequest,
  parsePickIndex,
  parseUpdatedFiles,
  parseEmailCommandArgs,
  isPostSetupHelpRequest,
  detectHelpTopic,
  buildPostSetupIntro,
  buildPostSetupHelp,
  buildHelpMessage,
  buildOnboardingSummary,
  detectUserLanguage,
  buildEmailConnectIntro,
  buildIcloudStepsIntro,
  randomUpdateBackMessage,
  pickUpdateFoundMessage,
  resolveUpdateCheck,
} from "./parsing";

import {
  extractEnvUpdates,
  isEnvUpdateRequest,
  applyEnvUpdates,
  saveEnvValue,
} from "./envManager";

import {
  readLocalLogSnippet,
  buildApiStatusResponse,
  checkEmailHealth,
} from "./health";

const authDir = resolve("state", "baileys");
const seenMessages = new Map<string, number>();
const SEEN_TTL_MS = 5 * 60 * 1000;
const typingState = new Map<
  string,
  { count: number; timer?: NodeJS.Timeout; startedAt?: number }
>();
let lastQr: string | null = null;
let lastQrAt = 0;
let isInitializing = false;
let activeSocket: WASocket | null = null;
let qrTimer: ReturnType<typeof setTimeout> | null = null;
let lastQrResetAt = 0;

async function attemptAutoFix(
  socket: WASocket,
  to: string,
  threadId: string,
  errorMessage: string,
): Promise<boolean> {
  const cleaned = errorMessage.trim();
  if (!cleaned) return false;

  // Detectar erros de autenticacao da API — avisar direto sem tentar usar a IA
  if (/authentication_error|invalid.*api.key|401|ANTHROPIC_API_KEY/i.test(cleaned)) {
    await sendAndLog(
      socket,
      to,
      threadId,
      "Parece que sua chave da Anthropic esta invalida ou nao foi configurada.\n\nPra resolver, me envie sua chave (comeca com sk-ant-) aqui no chat, ou edite o arquivo .env no servidor:\n\nnano /opt/turion/.env\n\nDepois reinicie: docker compose restart",
      { polish: false },
    );
    return true;
  }

  await sendAndLog(
    socket,
    to,
    threadId,
    `Deu um erro: ${cleaned}. Vou tentar diagnosticar.`,
    { polish: false },
  );

  if (/ENOENT/.test(cleaned) && /logs/i.test(cleaned)) {
    try {
      const { mkdir, writeFile } = await import("node:fs/promises");
      await mkdir(resolve("logs"), { recursive: true });
      await writeFile(resolve("logs", "error.log"), "", { flag: "a" });
      await sendAndLog(socket, to, threadId, "Criei a pasta de logs e o arquivo base.", { polish: false });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha ao criar logs";
      await sendAndLog(socket, to, threadId, `Nao consegui corrigir automaticamente: ${message}`, { polish: false });
      return true;
    }
  }

  const logs = await readLocalLogSnippet();
  if (!logs || !process.env.ANTHROPIC_API_KEY) {
    await sendAndLog(
      socket,
      to,
      threadId,
      "Nao encontrei logs locais ou a chave da IA nao esta configurada. Me envia sua ANTHROPIC_API_KEY (comeca com sk-ant-) aqui no chat.",
      { polish: false },
    );
    return true;
  }

  await sendAndLog(socket, to, threadId, "Fazendo... analisando logs com IA.");
  const diagnosis = await diagnoseLogs(logs).catch(() => null);
  if (!diagnosis) {
    await sendAndLog(socket, to, threadId, "Nao consegui interpretar os logs agora. Posso tentar de novo?");
    return true;
  }
  if (!diagnosis.safe_next_steps?.length) {
    await sendAndLog(socket, to, threadId, `Diagnostico: ${diagnosis.summary}. Quer que eu tente outra coisa?`);
    return true;
  }
  await sendAndLog(socket, to, threadId, "Agora vou fazer os passos seguros sugeridos.");
  for (const step of diagnosis.safe_next_steps) {
    const skill = findSkillByIntent(step.skill.toUpperCase());
    if (!skill) {
      await sendAndLog(socket, to, threadId, `Passo ignorado (skill nao encontrada): ${step.skill}`);
      continue;
    }
    await skill.execute(step.args ?? {}, { platform: process.platform });
  }
  await sendAndLog(socket, to, threadId, "Pronto. Apliquei os passos seguros. Quer que eu rode um status?");
  return true;
}
async function ensureOwnerLanguage(
  owner: Awaited<ReturnType<typeof getOwnerState>>,
  text: string,
): Promise<"pt-BR" | "en-US"> {
  const detected = detectUserLanguage(text);
  const current = owner?.language;
  if (!current && detected) {
    await updateOwnerDetails({ language: detected });
    await addMemoryItem("user_fact", `idioma preferido: ${detected}`);
    return detected;
  }
  if (current === "en-US" || current === "pt-BR") {
    return current;
  }
  return detected ?? "pt-BR";
}

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

async function startTyping(socket: WASocket, to: string): Promise<void> {
  const current = typingState.get(to) ?? { count: 0 };
  current.count += 1;
  if (!current.timer) {
    current.startedAt = Date.now();
    await socket.sendPresenceUpdate("composing", to);
    current.timer = setInterval(() => {
      socket.sendPresenceUpdate("composing", to).catch(() => undefined);
    }, 7000);
  }
  typingState.set(to, current);
}

async function stopTyping(socket: WASocket, to: string): Promise<void> {
  const current = typingState.get(to);
  if (!current) return;
  current.count -= 1;
  if (current.count <= 0) {
    if (current.timer) {
      clearInterval(current.timer);
    }
    typingState.delete(to);
    const startedAt = current.startedAt ?? Date.now();
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1500) {
      await new Promise((r) => setTimeout(r, 1500 - elapsed));
    }
    await socket.sendPresenceUpdate("paused", to);
    return;
  }
  typingState.set(to, current);
}

async function resetAuthState(): Promise<void> {
  try {
    await rm(authDir, { recursive: true, force: true });
  } catch {
    return;
  }
}

export async function initWhatsApp(): Promise<WASocket> {
  if (isInitializing && activeSocket) {
    return activeSocket;
  }
  isInitializing = true;
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "warn" }),
    getMessage: async () => undefined,
  });
  activeSocket = socket;
  isInitializing = false;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const owner = await getOwnerState();
      const now = Date.now();
      const recentlyShown = lastQr && now - lastQrAt < 15 * 1000;
      if (!recentlyShown && qr !== lastQr) {
        lastQr = qr;
        lastQrAt = now;
        const qrText = await qrcode.toString(qr, { type: "terminal" });
        console.log(qrText);
        console.log("  Escaneie o QR Code acima com o WhatsApp.");
        console.log("  (WhatsApp > Menu > Aparelhos conectados > Conectar)");
        if (!owner?.owner_jid) {
          const code = await ensurePairingCode();
          console.log("");
          console.log("  ================================================");
          console.log(`  SUA SENHA DE ATIVACAO:  ${code}`);
          console.log("  ================================================");
          console.log("  Envie essa senha no WhatsApp apos escanear o QR.");
          console.log("");
        }
        if (qrTimer) clearTimeout(qrTimer);
        qrTimer = setTimeout(async () => {
          const elapsed = Date.now() - lastQrAt;
          if (elapsed < 55 * 1000) return;
          if (Date.now() - lastQrResetAt < 60 * 1000) return;
          lastQrResetAt = Date.now();
          console.warn("[Turion] QR expirou. Gerando um novo...");
          await resetAuthState();
          void initWhatsApp();
        }, 60 * 1000);
      }
    }

    if (connection === "open") {
      console.log("[Turion] WhatsApp conectado com sucesso!");
      const ownerCheck = await getOwnerState();
      if (!ownerCheck?.owner_jid) {
        const pin = ownerCheck?.pairing_code ?? (await ensurePairingCode());
        console.log("");
        console.log("  ================================================");
        console.log(`  ENVIE NO WHATSAPP A SENHA:  ${pin}`);
        console.log("  ================================================");
        console.log("");
      }
      lastQr = null;
      lastQrAt = 0;
      if (qrTimer) {
        clearTimeout(qrTimer);
        qrTimer = null;
      }
      const pendingUpdate = await consumeUpdatePending();
      if (pendingUpdate?.to) {
        await socket.sendMessage(pendingUpdate.to, {
          text: randomUpdateBackMessage(),
        });
      }
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      const shouldResetAuth =
        statusCode === DisconnectReason.loggedOut ||
        statusCode === DisconnectReason.badSession ||
        statusCode === DisconnectReason.connectionReplaced ||
        statusCode === 401;

      console.warn("[Turion] WhatsApp desconectado.", {
        statusCode,
        shouldReconnect,
      });
      if (lastQr && Date.now() - lastQrAt > 2 * 60 * 1000) {
        lastQr = null;
      }
      if (qrTimer) {
        clearTimeout(qrTimer);
        qrTimer = null;
      }

      if (shouldResetAuth) {
        console.warn("[Turion] Sessao encerrada. Gerando novo QR Code...");
        activeSocket = null;
        await resetAuthState();
        setTimeout(() => {
          void initWhatsApp();
        }, 8000);
        return;
      }
      if (shouldReconnect) {
        setTimeout(() => {
          void initWhatsApp();
        }, 5000);
      }
    }
  });

  socket.ev.on("messages.upsert", async (event) => {
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
      let owner = await getOwnerState();
      let ownerJid = owner?.owner_jid;
      if (!ownerJid && owner?.setup_done) {
        owner = await setOwner(sender);
        ownerJid = owner?.owner_jid;
      }
      const authorized =
        !ownerJid ||
        sameOwner(ownerJid, sender) ||
        sameOwner(ownerJid, from) ||
        isAuthorized(sender) ||
        isAuthorized(from);
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
      await startTyping(socket, from);
      try {
        let pending = await getPending(threadId);
        const sanitizedText = sanitizeConversationText(text, pending);
        const isInSetup = pending?.type === "OWNER_SETUP";
        if (!isInSetup && parseApiStatusRequest(text)) {
          const response = await buildApiStatusResponse();
          await sendAndLog(socket, from, threadId, response);
          continue;
        }
        const interaction = await getInteractionState();
        if (parseRetryRequest(text) && interaction.lastTopic) {
          if (interaction.lastTopic === "update_check") {
            const checkScript =
              process.platform === "win32" ? "update_check.ps1" : "update_check.sh";
            let status = "";
            try {
              status = await runScript(checkScript);
            } catch {
              status = "";
            }
            const decision = resolveUpdateCheck(status);
            if (decision.kind === "available") {
              await sendAndLog(socket, from, threadId, pickUpdateFoundMessage());
              const updateScript =
                process.platform === "win32" ? "update_self.ps1" : "update_self.sh";
              await executeUpdate(socket, from, threadId, updateScript);
              continue;
            }
            if (decision.kind === "up_to_date") {
              await sendAndLog(socket, from, threadId, "Ainda nao ha update novo por aqui.");
              continue;
            }
            await sendAndLog(socket, from, threadId, decision.message ?? "Nao consegui checar agora.");
            continue;
          }
          if (interaction.lastTopic === "model_update") {
            await sendAndLog(socket, from, threadId, buildModelUpdateExplanation());
            continue;
          }
          if (interaction.lastTopic === "email_list") {
            if (isEmailListFollowup(text)) {
              const emailSkill = new EmailSkill();
              const result = await emailSkill.execute(
                { action: "list", limit: 10, unreadOnly: true },
                { platform: process.platform },
              );
              await sendAndLog(socket, from, threadId, result.output);
              continue;
            }
          }
        }
        const awaitingApiKey =
          pending?.type === "OWNER_SETUP" &&
          pending.stage === "await_anthropic_key";
        if (!awaitingApiKey) {
          const handledAnthropic = await handleStandaloneAnthropicKey(socket, from, threadId, text);
          if (handledAnthropic) {
            continue;
          }
          const handledKey = await handleStandaloneApiKey(socket, from, threadId, text);
          if (handledKey) {
            continue;
          }
        }
        if (!pending) {
          const reminder = parseRelativeReminder(text);
          if (reminder) {
            const timezone = await getTimezone();
            const scheduleAt = new Date(Date.now() + reminder.offsetMs);
            try {
              await createCronNormalized({
                name: `reminder_${Date.now()}`,
                schedule: scheduleAt.toISOString(),
                jobType: "reminder",
                payload: JSON.stringify({ to: from, message: reminder.message }),
                runOnce: true,
                timezone,
              });
              const when = await getCurrentTimeString();
              await sendAndLog(
                socket,
                from,
                threadId,
                `Fechado. Vou te lembrar em ${Math.round(reminder.offsetMs / 60000)} minuto(s). Agora sao ${when}.`,
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : "Falha ao criar lembrete.";
              await sendAndLog(socket, from, threadId, `Nao consegui criar o lembrete: ${message}`);
            }
            continue;
          }
        }
        if (owner?.setup_done && pending?.type === "OWNER_SETUP") {
          await clearPending(threadId);
          pending = null;
        }
      if (!pending) {
        const quoted = extractQuotedText(message);
        if (quoted && owner?.paired_at && !owner?.setup_done) {
          const quotedLower = quoted.toLowerCase();
          if (quotedLower.includes("acertei")) {
            pending = { type: "OWNER_SETUP", stage: "confirm_summary", createdAt: new Date().toISOString() };
          } else if (quotedLower.includes("horario")) {
            pending = { type: "OWNER_SETUP", stage: "ask_timezone", createdAt: new Date().toISOString() };
          }
        }
      }
      if (pending && pending.type === "OWNER_SETUP") {
        if (!ownerJid) {
          await setOwner(sender);
        }
        const handled = await handleOwnerSetup(socket, from, threadId, pending, text);
        if (handled) {
          continue;
        }
      }
      if (!ownerJid && owner?.paired_at) {
        await setOwner(sender);
      }
      if (!ownerJid) {
        const code = owner?.pairing_code ?? (await ensurePairingCode());
        const normalized = text.trim();
        if (normalized === code) {
          const language = await ensureOwnerLanguage(owner, text);
          const isEnglish = language.startsWith("en");
          await setOwner(sender);
          await setPending(threadId, {
            type: "OWNER_SETUP",
            stage: "await_anthropic_key",
            createdAt: new Date().toISOString(),
          });
          await sendAndLog(
            socket,
            from,
            threadId,
            isEnglish
              ? "Hey, nice to meet you! We just connected.\n\nTo get me up and running, I need your Anthropic API key — it starts with sk-ant-.\nCan you paste it here for me?"
              : "Opa, prazer! Acabamos de nos conectar.\n\nPra eu funcionar, preciso da sua chave da Anthropic — ela comeca com sk-ant-.\nCola ela aqui pra mim?",
            { polish: false },
          );
          continue;
        }
        const language = await ensureOwnerLanguage(owner, text);
        const isEnglish = language.startsWith("en");
        await sendAndLog(
          socket,
          from,
          threadId,
          isEnglish
            ? "Hey! To get started, send me the *4-digit PIN* shown in the terminal after the QR code.\n\nNeed help? Visit https://www.turion.network"
            : "Oi! Pra comecar, me envia a *senha de 4 digitos* que apareceu no terminal depois do QR code.\n\nPrecisa de ajuda? Acesse https://www.turion.network",
          { polish: false },
        );
        continue;
      }
      if (pending && pending.type === "EMAIL_CONNECT_FLOW") {
        const handled = await handlePendingEmailConnect(socket, from, threadId, pending, text);
        if (handled) {
          continue;
        }
      }
      if (ownerJid && isEnvUpdateRequest(text)) {
        const updates = extractEnvUpdates(text);
        if (Object.keys(updates).length > 0) {
          await sendAndLog(socket, from, threadId, "Boa, peguei as credenciais. Vou adicionar no .env agora.");
          const result = await applyEnvUpdates(updates);
          if (result.errors.length > 0) {
            await sendAndLog(
              socket,
              from,
              threadId,
              `Deu um erro em alguns valores:\n- ${result.errors.join("\n- ")}\nVou precisar que voce confirme.`,
            );
          }
          if (result.applied.length > 0) {
            await sendAndLog(
              socket,
              from,
              threadId,
              `Fazendo... adicionei: ${result.applied.join(", ")}.`,
            );
            const status = await buildApiStatusResponse();
            await sendAndLog(socket, from, threadId, status);
          }
          continue;
        }
      }
      await recordInteraction(threadId, from);
      await updatePreferencesFromMessage(text).catch(() => undefined);
      await updateRouterFromMessage(text).catch(() => undefined);
      await touchEmotionState().catch(() => undefined);
      const feedback = await applyFeedback(text);
      if (feedback) {
        if (feedback.memoryText) {
          await addMemoryItem("user_fact", feedback.memoryText);
        }
        await syncStyleFromBehavior().catch(() => undefined);
        await sendAndLog(socket, from, threadId, "Fechado. Vou ajustar meu jeito de responder.");
        continue;
      }
      if (pending && pending.type === "EMAIL_DELETE_PICK") {
        const handled = await handlePendingEmailDeletePick(socket, from, threadId, pending, text);
        if (handled) {
          continue;
        }
      }
      const decision = parseConfirmation(text);
      if (pending && decision) {
        await handlePendingDecision(socket, from, threadId, pending, decision);
        continue;
      }
      if (isPostSetupHelpRequest(text) || text.toLowerCase().includes("configurar")) {
        const topic = detectHelpTopic(text);
        const help = buildHelpMessage(topic);
        await sendAndLog(socket, from, threadId, help);
        continue;
      }
      if (owner?.setup_done && isPostSetupHelpRequest(text)) {
        const help = [
          "Boa, aqui vao alguns exemplos pra te guiar:",
          buildPostSetupHelp(),
          "Quer que eu ja configure algo pra voce?",
        ].join("\n");
        await sendAndLog(socket, from, threadId, help);
        continue;
      }
      const deleteHandled = await maybeHandleEmailDeleteRequest(socket, from, threadId, text);
      if (deleteHandled) {
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
        // STEP-08: Tentar Brain V2 primeiro (Migration Wrapper)
        processBrainMessage({
          socket,
          message: text,
          userId: sender,
          threadId,
          from,
        }).then(async (response) => {
          if (response) {
            // Brain V2 processou a mensagem
            console.log("[Turion] Brain V2 processou a mensagem");
            await sendAndLog(socket, from, threadId, response);
          } else {
            // Usar sistema legado
            console.log("[Turion] Usando sistema legado");
            return handleBrain(socket, from, threadId, text);
          }
        }).catch((error) => {
          console.error("[Turion] erro no brain:", error);
        });
      }
      } finally {
        await stopTyping(socket, from);
      }
    }
  });

  registerCronHandler("reminder", async (job) => {
    const payload = safeJson<{ to?: string; message?: string }>(job.payload);
    const messageText = payload?.message ? payload.message : "Lembrete";
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

  registerCronHandler("interaction_checkin", async () => {
    const state = await getInteractionState();
    const lastJid = state.lastJid;
    if (!lastJid) return;
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastSentDate == today) return;
    const messages = [
      "E ai, tudo certo por ai?",
      "Passando so pra ver se ta tudo ok.",
      "Se precisar de algo, to por aqui.",
      "Como foi o dia ate agora?",
    ];
    const pick = messages[Math.floor(Math.random() * messages.length)];
    await socket.sendMessage(lastJid, { text: pick });
    await markCheckinSent();
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

  registerCronHandler("silent_study_check", async () => {
    await runSilentStudy();
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
    const load = os.loadavg?.() ?? [];
    let diskLine = "- disk: n/a";
    try {
      const stats = statfsSync("/");
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      const toGb = (value: number) => Math.round((value / 1024 / 1024 / 1024) * 10) / 10;
      diskLine = `- disk: ${toGb(used)}GB used / ${toGb(total)}GB total`;
    } catch {
      // ignore disk errors
    }
    const response = [
      "Status",
      `- assistant: online`,
      `- uptime: ${uptimeSec}s`,
      `- platform: ${process.platform} ${process.arch}`,
      `- hostname: ${os.hostname()}`,
      `- cpu_load: ${load.length ? load.map((v) => v.toFixed(2)).join(", ") : "n/a"}`,
      `- ram: ${Math.round(memory.rss / 1024 / 1024)} MB rss`,
      `- assistant_weight: ${Math.round(memory.rss / 1024 / 1024)} MB`,
      diskLine,
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
      await executeUpdate(socket, to, threadId, updateScript);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na atualiza??o.";
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
    const cleanup = extractCleanupSuggestion(result.output);
    if (cleanup) {
      await setPending(threadId, {
        type: "EMAIL_DELETE_SUGGEST",
        items: cleanup.items,
        createdAt: new Date().toISOString(),
      });
    }
    await sendAndLog(socket, to, threadId, cleanup ? cleanup.text : result.output);
    return;
  }

  if (cmd === "git") {
    const sub = args[0] ?? "";
    const target = args[1] ?? "";
    if (sub === "setup") {
      const setupScript =
        process.platform === "win32" ? "git_setup_ssh.ps1" : "git_setup_ssh.sh";
      try {
        const output = await runScript(setupScript);
        const pubKey = output.split("\n").find((l) => l.startsWith("PUBLIC_KEY:")) ?? "";
        const fingerprint =
          output.split("\n").find((l) => l.startsWith("FINGERPRINT:")) ?? "";
        const message = [
          "Chave SSH gerada. Copie a PUBLIC KEY abaixo e adicione no GitHub:",
          "",
          pubKey.replace("PUBLIC_KEY:", "").trim(),
          "",
          fingerprint.trim(),
          "",
          "GitHub > Repo > Settings > Deploy keys > Add deploy key",
          "Depois me avise: 'ja adicionei'.",
        ].join("\n");
        await sendAndLog(socket, to, threadId, message);
        return;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha ao gerar chave.";
        await sendAndLog(socket, to, threadId, `Erro: ${message}`);
        return;
      }
    }
    if (sub === "test") {
      const testScript =
        process.platform === "win32" ? "git_test_ssh.ps1" : "git_test_ssh.sh";
      const output = await runScript(testScript);
      await sendAndLog(socket, to, threadId, output.includes("OK") ? "Conexao OK ✅" : output);
      return;
    }
    if (sub === "clone") {
      if (!target) {
        await sendAndLog(socket, to, threadId, "Uso: git clone <owner/repo>");
        return;
      }
      const repoUrl = `git@github.com:${target}.git`;
      const base =
        process.platform === "win32" ? "C:\\\\opt\\\\turion\\\\projects" : "/opt/turion/projects";
      const name = target.split("/").pop() ?? target;
      const path =
        process.platform === "win32" ? `${base}\\\\${name}` : `${base}/${name}`;
      const script = process.platform === "win32" ? "git_clone.ps1" : "git_clone.sh";
      try {
        const output = await runScript(script, [repoUrl, path]);
        await sendAndLog(socket, to, threadId, output || "Clone concluído.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha ao clonar.";
        await sendAndLog(socket, to, threadId, `Erro: ${message}`);
      }
      return;
    }
    if (sub === "pull") {
      if (!target) {
        await sendAndLog(socket, to, threadId, "Uso: git pull <project>");
        return;
      }
      const base =
        process.platform === "win32" ? "C:\\\\opt\\\\turion\\\\projects" : "/opt/turion/projects";
      const path =
        process.platform === "win32" ? `${base}\\\\${target}` : `${base}/${target}`;
      const script = process.platform === "win32" ? "git_pull.ps1" : "git_pull.sh";
      try {
        const output = await runScript(script, [path]);
        await sendAndLog(socket, to, threadId, output || "Pull concluído.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Falha no pull.";
        await sendAndLog(socket, to, threadId, `Erro: ${message}`);
      }
      return;
    }
    await sendAndLog(socket, to, threadId, "Uso: git setup|test|clone|pull");
    return;
  }

  if (cmd === "memory" || cmd === "mem") {
    const action = args[0];
    if (!action) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Uso: memory add <user_fact|project_fact|decision|running_task> <texto> | memory search <keywords>",
      );
      return;
    }
    if (action === "add") {
      const rawType = (args[1] ?? "").toLowerCase();
      const typeMap: Record<string, "user_fact" | "project_fact" | "decision" | "running_task"> = {
        fact: "user_fact",
        preference: "user_fact",
        user_fact: "user_fact",
        project_fact: "project_fact",
        decision: "decision",
        task: "running_task",
        running_task: "running_task",
      };
      const type = typeMap[rawType];
      const textValue = args.slice(2).join(" ");
      if (!type || !textValue) {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Uso: memory add <user_fact|project_fact|decision|running_task> <texto>",
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
            return `- [project_fact] ${item.name} | ${item.repo_url}`;
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

    if (parseEmailAccessQuestion(text)) {
      const config = await loadEmailConfig();
      if (config) {
        await sendAndLog(
          socket,
          to,
          threadId,
          `Sim, ja tenho acesso ao seu email (${config.provider}). Quer que eu verifique novos emails?`,
        );
      } else {
        await sendAndLog(socket, to, threadId, buildEmailConnectIntro());
      }
      return;
    }

    if (parseEmailConnectRequest(text)) {
      const config = await loadEmailConfig();
      if (config) {
        await sendAndLog(
          socket,
          to,
          threadId,
          `Ja estou conectada no seu email (${config.provider}). Quer que eu verifique novos emails?`,
        );
      } else {
        await sendAndLog(socket, to, threadId, buildEmailConnectIntro());
      }
      return;
    }

    if (parseEmailSecurityQuestion(text)) {
      try {
        const answer = await explainEmailSecurity(text);
        await sendAndLog(
          socket,
          to,
          threadId,
          answer ??
            "Posso explicar com calma como funciona a conexao e as senhas de app. Quer que eu detalhe o passo a passo?",
        );
      } catch {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Posso explicar com calma como funciona a conexao e as senhas de app. Quer que eu detalhe o passo a passo?",
        );
      }
      return;
    }

    if (parseEmailStatusRequest(text)) {
      const config = await loadEmailConfig();
      if (config) {
        await sendAndLog(
          socket,
          to,
          threadId,
          `Sim, estou conectada no seu email (${config.provider}). Quer que eu verifique novos emails?`,
        );
        await setLastTopic("email_list");
      } else {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Ainda nao estou conectada ao seu email. Posso conectar com Gmail ou iCloud. Qual voce prefere?",
        );
      }
      return;
    }

    if (parseEmailPromoRequest(text)) {
      let snap = await loadEmailSnapshot();
      if (!snap || snap.items.length === 0) {
        const emailSkill = new EmailSkill();
        await sendAndLog(socket, to, threadId, "Beleza, vou checar seus emails pra listar newsletters.");
        const listResult = await emailSkill.execute(
          { action: "list", limit: 30, unreadOnly: false, mode: "summary", suggestCleanup: false },
          { platform: process.platform },
        );
        if (!listResult.ok) {
          await sendAndLog(socket, to, threadId, "Nao consegui listar agora: " + listResult.output);
          return;
        }
        snap = await loadEmailSnapshot();
      }
      const promos = (snap?.items ?? []).filter(
        (item) => item.category === "promo" || item.category === "newsletter",
      );
      if (promos.length === 0) {
        await sendAndLog(socket, to, threadId, "Nao achei newsletters/promos na ultima checagem.");
        return;
      }
      await sendAndLog(socket, to, threadId, buildPromoListMessage(promos));
      await setPending(threadId, {
        type: "EMAIL_DELETE_PICK",
        items: promos.map((item) => ({ id: item.id, sender: item.sender, subject: item.subject })),
        createdAt: new Date().toISOString(),
      });
      await setLastTopic("email_list");
      return;
    }
    const provider = parseEmailProvider(text);
    if (provider) {
      await setPending(threadId, {
        type: "EMAIL_CONNECT_FLOW",
        provider,
        stage: "await_email",
        createdAt: new Date().toISOString(),
      });
      if (provider === "icloud") {
        await sendAndLog(socket, to, threadId, buildIcloudStepsIntro());
      } else {
        await sendAndLog(
          socket,
          to,
          threadId,
          [
            "Perfeito. Para Gmail usamos App Password (mais seguro que a senha principal).",
            "Se quiser, eu explico com calma o passo a passo.",
            "Agora me envie seu email completo.",
          ].join("\n"),
        );
      }
      return;
    }

      if (parseModelUpdateQuestion(text)) {
        await sendAndLog(socket, to, threadId, buildModelUpdateExplanation());
        await setLastTopic("model_update");
        return;
      }

      if (parseUpdateCheckRequest(text) || parseUpdateRequest(text) || parseUpdateStatusRequest(text)) {
        const upToDateMsg = parseUpdateCheckRequest(text)
          ? "Chequei de novo e continua tudo atualizado por aqui."
          : parseUpdateRequest(text)
            ? "Por aqui ta tudo em dia e funcionando certinho. Se quiser, posso checar de novo quando voce quiser."
            : "Nao achei update novo agora. Se quiser, posso checar de novo.";
        const fallbackErr = "Nao consegui checar agora.";
        const checkScript = process.platform === "win32" ? "update_check.ps1" : "update_check.sh";
        let status = "";
        try {
          status = await runScript(checkScript);
        } catch {
          status = "";
        }
        const decision = resolveUpdateCheck(status);
        if (decision.kind === "available") {
          await sendAndLog(socket, to, threadId, pickUpdateFoundMessage());
          const updateScript = process.platform === "win32" ? "update_self.ps1" : "update_self.sh";
          await executeUpdate(socket, to, threadId, updateScript);
        } else if (decision.kind === "up_to_date") {
          await sendAndLog(socket, to, threadId, upToDateMsg);
        } else {
          await sendAndLog(socket, to, threadId, decision.message ?? fallbackErr);
        }
        await setLastTopic("update_check");
        return;
      }

    if (parseGitStatusRequest(text)) {
      const gitStatusScript =
        process.platform === "win32" ? "git_status.ps1" : "git_status.sh";
      let status = "";
      try {
        status = await runScript(gitStatusScript);
      } catch {
        status = "";
      }
      if (status.startsWith("CONNECTED")) {
        const url = status.replace("CONNECTED", "").trim();
        await sendAndLog(
          socket,
          to,
          threadId,
          `Sim, estou conectado no seu Git: ${url}. Quer que eu verifique atualizações?`,
        );
        return;
      }
      if (status.includes("NOT_A_GIT_REPO")) {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Ainda não estou conectado a nenhum repositório aqui. Quer que eu configure o Git?",
        );
        return;
      }
      if (status.includes("GIT_NOT_FOUND")) {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Git não está instalado no ambiente. Posso instalar e configurar se você quiser.",
        );
        return;
      }
      await sendAndLog(
        socket,
        to,
        threadId,
        "Não consegui confirmar o Git agora, mas posso tentar novamente quando você quiser.",
      );
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
    if (digest) {
      const digestLine = [
        `Resumo: ${digest.summary}`,
        `Objetivo atual: ${digest.current_goal}`,
        `Ultima acao: ${digest.last_action}`,
        `Proximo passo: ${digest.next_step}`,
      ].join(" | ");
      parts.push(`Resumo da thread: ${digestLine}`);
    }
    if (recent.length) parts.push(`Ultimas mensagens:\n${recent.join("\n")}`);
    if (memoryContext) parts.push(memoryContext);
    parts.push(`Mensagem: ${text}`);
    const input = parts.join("\n");
    const result = await interpretStrictJson(input);
    if (!result) {
      await sendAndLog(socket, to, threadId, "IA sem resposta válida.");
      return;
    }
    const currentPending = await getPending(threadId).catch(() => null);
    const interaction = await getInteractionState().catch(() => null);
    const emailContext =
      currentPending?.type === "EMAIL_CONNECT_FLOW" ||
      currentPending?.type === "EMAIL_DELETE_SUGGEST" ||
      currentPending?.type === "EMAIL_DELETE_PICK" ||
      currentPending?.type === "EMAIL_DELETE_CONFIRM" ||
      (interaction?.lastTopic === "email_list" &&
        isRecentTimestamp(interaction?.lastTopicAt));
    const allowEmail = userMentionsEmail(text) || emailContext;

    if (result.intent.startsWith("EMAIL_") && !allowEmail) {
      result.intent = "CHAT";
      result.action = "NONE";
      result.needs_confirmation = false;
    }
    const skipReply =
      result.action === "RUN_SKILL" && result.intent === "CRON_CREATE";
  if (result.reply && !skipReply) {
    const structured = enforceResponseStructure(result.reply);
    if (!allowEmail) {
      const cleaned = stripEmailContent(structured);
      const fallback = cleaned.trim()
        ? cleaned
        : "Tudo certo por aqui. Como posso ajudar?";
      await sendAndLog(socket, to, threadId, fallback);
    } else {
      await sendAndLog(socket, to, threadId, structured);
    }
  } else if (!result.reply && !skipReply) {
      const responseLines = [
        `Intent: ${result.intent}`,
        `Args: ${JSON.stringify(result.args)}`,
        result.missing.length ? `Missing: ${result.missing.join(", ")}` : "Missing: none",
        `Needs confirmation: ${result.needs_confirmation}`,
      ];
      await sendAndLog(socket, to, threadId, responseLines.join("\n"));
  }

  if (
    result.action === "RUN_SKILL" &&
    result.intent === "SUPABASE_SQL" &&
    !result.needs_confirmation
  ) {
    const args = result.args ?? {};
    if (args.sql && !args.allowDestructive) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Deu um erro em confirmação pendente. Vou arrumar pedindo confirmação primeiro.",
      );
      await setPending(threadId, {
        type: "RUN_SKILL",
        intent: result.intent,
        args,
        createdAt: new Date().toISOString(),
      });
      await sendAndLog(socket, to, threadId, "Confirma? Me responde com 'sim' ou 'nao'.");
      return;
    }
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
          "Confirma? Me responde com 'sim' ou 'nao'.",
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
          "Confirma? Me responde com 'sim' ou 'nao'.",
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
          const payloadRaw = args.payload;
          let message = typeof args.message === "string" ? args.message : "";
          if (!message && typeof payloadRaw === "string") {
            try {
              const parsed = JSON.parse(payloadRaw) as { message?: string };
              if (parsed?.message) message = parsed.message;
            } catch {
              message = payloadRaw;
            }
          }
          if (!message && payloadRaw && typeof payloadRaw === "object") {
            const parsed = payloadRaw as { message?: string };
            if (parsed?.message) message = parsed.message;
          }
          if (!message) message = "Lembrete";
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
        if (result.intent === "EMAIL_DELETE") {
          const snapshot = await loadEmailSnapshot();
          const resolved = resolveEmailDeleteTargets(text, snapshot?.items ?? []);
          if (resolved?.items?.length) {
            await setPending(threadId, {
              type: "EMAIL_DELETE_CONFIRM",
              items: resolved.items.map((item) => ({
                id: item.id,
                sender: item.sender,
                subject: item.subject,
              })),
              createdAt: new Date().toISOString(),
            });
            await sendAndLog(socket, to, threadId, buildEmailDeletePrompt(resolved.items));
            return;
          }
          if (!result.args || !("id" in result.args)) {
            await sendAndLog(
              socket,
              to,
              threadId,
              "Qual email voce quer apagar? Se quiser, posso listar os mais recentes.",
            );
            return;
          }
        }
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
              `Rascunho:\n${draftResult.output}\n\nConfirma envio? Me responde com 'sim' ou 'nao'.`,
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
        await attemptAutoFix(socket, to, threadId, "Skill não encontrada");
        return;
      }
      const outcome = await skill.execute(result.args ?? {}, { platform: process.platform });
      const cleanup = extractCleanupSuggestion(outcome.output);
      if (cleanup) {
        await setPending(threadId, {
          type: "EMAIL_DELETE_SUGGEST",
          items: cleanup.items,
          createdAt: new Date().toISOString(),
        });
      }
      await sendAndLog(socket, to, threadId, cleanup ? cleanup.text : outcome.output);
      return;
    }

    if (result.actions && result.actions.length > 0) {
      const outputs = await executeActions(result.actions);
      await sendAndLog(socket, to, threadId, outputs.join("\n"));
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no interpretador.";
    await sendAndLog(socket, to, threadId, `Erro IA: ${message}`, { polish: false });
    await attemptAutoFix(socket, to, threadId, message);
  }
}

async function sendAndLog(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
  options: { polish?: boolean } = {},
): Promise<void> {
  const marker = "/*__NOPOLISH__*/";
  const hasMarker = text.includes(marker);
  const cleanedText = hasMarker ? text.replace(marker, "").trim() : text.trim();
  const shouldPolish = options.polish !== false && !hasMarker;
  const formattedText = shouldPolish ? await polishReply(cleanedText) : cleanedText;
  await socket.sendMessage(to, { text: formattedText });
  await appendConversation({
    ts: new Date().toISOString(),
    from: "Tur",
    thread: threadId,
    direction: "out",
    text: formattedText,
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

async function handlePendingEmailConnect(
  socket: WASocket,
  to: string,
  threadId: string,
  pending: { type: "EMAIL_CONNECT_FLOW"; provider: "icloud" | "gmail"; stage: "await_email" | "await_password"; email?: string },
  text: string,
): Promise<boolean> {
  if (pending.stage === "await_email") {
    const email = extractEmail(text);
    if (!email) {
      if (parseEmailSecurityQuestion(text)) {
        try {
          const answer = await explainEmailSecurity(text);
          await sendAndLog(
            socket,
            to,
            threadId,
            answer ??
              "Posso explicar com calma como funciona a conexao e por que usamos App Password. Quer que eu detalhe?",
          );
        } catch {
          await sendAndLog(
            socket,
            to,
            threadId,
            "Posso explicar com calma como funciona a conexao e por que usamos App Password. Quer que eu detalhe?",
          );
        }
        return true;
      }
      return false;
    }
    await setPending(threadId, {
      type: "EMAIL_CONNECT_FLOW",
      provider: pending.provider,
      stage: "await_password",
      email,
      createdAt: new Date().toISOString(),
    });
      const hint =
        pending.provider === "icloud"
          ? "Agora me envie a App-Specific Password (ela e diferente da sua senha normal). Se quiser, explico com calma."
          : "Agora me envie a App Password do Gmail (mais seguro que a senha normal). Se quiser, explico com calma.";
    await sendAndLog(socket, to, threadId, hint);
    return true;
  }

  if (pending.stage === "await_password") {
    const password = text.trim();
    if (!password) return false;
    if (parseEmailSecurityQuestion(text)) {
      try {
        const answer = await explainEmailSecurity(text);
        await sendAndLog(
          socket,
          to,
          threadId,
          answer ??
            "Posso explicar com calma como funciona a conexao e por que usamos App Password. Quer que eu detalhe?",
        );
      } catch {
        await sendAndLog(
          socket,
          to,
          threadId,
          "Posso explicar com calma como funciona a conexao e por que usamos App Password. Quer que eu detalhe?",
        );
      }
      return true;
    }
    const emailSkill = new EmailSkill();
    const result = await emailSkill.execute(
      {
        action: "connect",
        provider: pending.provider,
        user: pending.email,
        password,
      },
      { platform: process.platform },
    );
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, result.output);
    return true;
  }

  return false;
}



async function handlePendingDecision(
  socket: WASocket,
  to: string,
  threadId: string,
  pending:
    | { type: "RUN_SKILL"; intent: string; args: Record<string, string | number | boolean | null> }
    | { type: "RUN_UPDATE" }
    | { type: "EMAIL_CONNECT_FLOW"; provider: "gmail" | "icloud"; stage: "await_email" | "await_password"; email?: string }
    | { type: "EMAIL_DELETE_SUGGEST"; items: Array<{ id: number; sender: string }> }
    | { type: "EMAIL_DELETE_CONFIRM"; items: Array<{ id: number; sender: string; subject: string }> }
    | { type: "EMAIL_DELETE_PICK"; items: Array<{ id: number; sender: string; subject: string }> }
    | {
        type: "OWNER_SETUP";
        stage:
          | "await_anthropic_key"
          | "ask_assistant_name"
          | "ask_user_name"
          | "ask_location"
          | "ask_timezone"
          | "confirm_summary";
      }
    | { type: "RUN_PLAN"; plan: Array<{ skill: string; args: Record<string, string | number | boolean | null> }> },
  decision: "confirm" | "cancel",
): Promise<void> {
  if (decision === "cancel") {
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, "Cancelado.");
    return;
  }
  if (pending.type === "RUN_UPDATE") {
    await clearPending(threadId);
    const updateScript =
      process.platform === "win32" ? "update_self.ps1" : "update_self.sh";
    try {
      await executeUpdate(socket, to, threadId, updateScript);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na atualiza??o.";
      await sendAndLog(socket, to, threadId, `Erro: ${message}`);
    }
    return;
  }
  if (pending.type === "EMAIL_DELETE_SUGGEST") {
    const emailSkill = new EmailSkill();
    const failures: Array<string> = [];
    for (const item of pending.items) {
      try {
        await emailSkill.execute({ action: "delete", id: item.id }, { platform: process.platform });
        const domain = extractEmailDomain(item.sender);
        if (domain) {
          await addEmailRule({
            type: "domain",
            value: domain,
            importance: "baixa",
            urgency: "baixa",
            action: "ignore",
          });
        }
      } catch {
        failures.push(`${item.sender} (#${item.id})`);
      }
    }
    await clearPending(threadId);
    if (failures.length > 0) {
      await sendAndLog(
        socket,
        to,
        threadId,
        `Apaguei alguns, mas falhei em: ${failures.join(", ")}. Quer tentar de novo?`,
      );
      return;
    }
    await sendAndLog(
      socket,
      to,
      threadId,
      "Pronto ✅ Apaguei esses emails. Quer que eu faça o mesmo com outros parecidos?",
    );
    return;
  }
  if (pending.type === "EMAIL_DELETE_CONFIRM") {
    const emailSkill = new EmailSkill();
    const failures: Array<string> = [];
    let successCount = 0;
    for (const item of pending.items) {
      try {
        const result = await emailSkill.execute(
          { action: "delete", id: item.id },
          { platform: process.platform },
        );
        if (!result.ok) {
          failures.push(`${item.sender} (#${item.id})`);
          continue;
        }
        successCount += 1;
      } catch {
        failures.push(`${item.sender} (#${item.id})`);
      }
    }
    await clearPending(threadId);
    if (successCount === 0) {
      await sendAndLog(
        socket,
        to,
        threadId,
        "Tentei apagar, mas deu erro. Quer que eu tente de novo?",
      );
      return;
    }
    if (failures.length > 0) {
      await sendAndLog(
        socket,
        to,
        threadId,
        `Apaguei ${successCount}, mas falhei em: ${failures.join(", ")}. Quer tentar de novo?`,
      );
      return;
    }
    const plural = successCount > 1 ? "emails" : "email";
    await sendAndLog(
      socket,
      to,
      threadId,
      `Pronto âœ… Apaguei ${successCount} ${plural}. Quer que eu faca mais alguma coisa?`,
    );
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
  if (pending.type !== "RUN_SKILL") {
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, "A??o pendente inv?lida.");
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

async function handlePendingEmailDeletePick(
  socket: WASocket,
  to: string,
  threadId: string,
  pending: { type: "EMAIL_DELETE_PICK"; items: Array<{ id: number; sender: string; subject: string }> },
  text: string,
): Promise<boolean> {
  const normalized = text.trim().toLowerCase();
  if (normalized.includes("todos") || normalized.includes("todas")) {
    await setPending(threadId, {
      type: "EMAIL_DELETE_CONFIRM",
      items: pending.items,
      createdAt: new Date().toISOString(),
    });
    await sendAndLog(socket, to, threadId, buildEmailDeletePrompt(pending.items));
    return true;
  }
  const pick = parsePickIndex(normalized, pending.items.length);
  if (pick !== null) {
    const item = pending.items[pick];
    await setPending(threadId, {
      type: "EMAIL_DELETE_CONFIRM",
      items: [item],
      createdAt: new Date().toISOString(),
    });
    await sendAndLog(socket, to, threadId, buildEmailDeletePrompt([item]));
    return true;
  }
  const decision = parseConfirmation(text);
  if (decision === "cancel") {
    await clearPending(threadId);
    await sendAndLog(socket, to, threadId, "Cancelado.");
    return true;
  }
  if (decision === "confirm") {
    await sendAndLog(socket, to, threadId, "Me diz qual numero voce quer apagar.");
    return true;
  }
  return false;
}

async function deleteResolvedEmails(
  socket: WASocket,
  to: string,
  threadId: string,
  items: Array<{ id: number; sender: string; subject: string }>,
): Promise<void> {
  const emailSkill = new EmailSkill();
  const failures: Array<string> = [];
  let successCount = 0;
  for (const item of items) {
    try {
      const result = await emailSkill.execute(
        { action: "delete", id: item.id },
        { platform: process.platform },
      );
      if (!result.ok) {
        failures.push(`${item.sender} (#${item.id})`);
        continue;
      }
      successCount += 1;
    } catch {
      failures.push(`${item.sender} (#${item.id})`);
    }
  }
  if (successCount === 0) {
    await sendAndLog(socket, to, threadId, "Tentei apagar, mas deu erro. Quer que eu tente de novo?");
    return;
  }
  if (failures.length > 0) {
    await sendAndLog(
      socket,
      to,
      threadId,
      `Apaguei ${successCount}, mas falhei em: ${failures.join(", ")}.`,
    );
    return;
  }
  const plural = successCount > 1 ? "emails" : "email";
  await sendAndLog(
    socket,
    to,
    threadId,
    `Pronto ✅ Deletei ${successCount} ${plural}.`,
  );
}

async function maybeHandleEmailDeleteRequest(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
): Promise<boolean> {
  let snapshot = await loadEmailSnapshot();
  let items = snapshot?.items ?? [];
  if (items.length === 0) {
    const emailSkill = new EmailSkill();
    const listResult = await emailSkill.execute(
      { action: "list", limit: 30, unreadOnly: false, mode: "summary", suggestCleanup: false },
      { platform: process.platform },
    );
    if (!listResult.ok) {
      return false;
    }
    snapshot = await loadEmailSnapshot();
    items = snapshot?.items ?? [];
  }
  if (items.length === 0) return false;
  const resolved = resolveEmailDeleteTargets(text, items);
  if (!resolved) return false;
  if (resolved.items.length === 0) {
    await sendAndLog(socket, to, threadId, "Nao achei esse email. Quer que eu liste os mais recentes?");
    return true;
  }
  if (resolved.needsPick) {
    await setPending(threadId, {
      type: "EMAIL_DELETE_PICK",
      items: resolved.items.map((item) => ({
        id: item.id,
        sender: item.sender,
        subject: item.subject,
      })),
      createdAt: new Date().toISOString(),
    });
    await sendAndLog(socket, to, threadId, buildEmailPickPrompt(resolved.items));
    return true;
  }
  await deleteResolvedEmails(socket, to, threadId, resolved.items);
  return true;
}

async function handleOwnerSetup(
  socket: WASocket,
  to: string,
  threadId: string,
  pending: {
    type: "OWNER_SETUP";
    stage:
      | "await_anthropic_key"
      | "ask_assistant_name"
      | "ask_user_name"
      | "ask_location"
      | "ask_timezone"
      | "confirm_summary";
  },
  text: string,
): Promise<boolean> {
  const value = text.trim();
  const sendSetup = (msg: string) => sendAndLog(socket, to, threadId, msg, { polish: false });
  if (!value) return false;
  const owner = await getOwnerState();
  const language = await ensureOwnerLanguage(owner, value);
  const isEnglish = language.startsWith("en");
  const assistantFallback = owner?.assistant_name ?? "Tur";

  if (pending.stage === "await_anthropic_key") {
    if (!isLikelyAnthropicKey(value)) {
      await sendSetup(
        isEnglish
          ? "Hmm, that key doesn't look right. Anthropic keys start with sk-ant- — can you try again?"
          : "Hmm, essa chave nao parece certa. As chaves da Anthropic comecam com sk-ant- — tenta de novo?",
      );
      return true;
    }
    await saveEnvValue("ANTHROPIC_API_KEY", value);
    process.env.ANTHROPIC_API_KEY = value;
    await addMemoryItem("decision", "Anthropic configurada como modelo principal");
    await setPending(threadId, {
      type: "OWNER_SETUP",
      stage: "ask_assistant_name",
      createdAt: new Date().toISOString(),
    });
    await sendSetup(
      isEnglish
        ? "Got it, key saved! Now tell me — what would you like to call me?"
        : "Perfeito, guardei sua chave! Agora me conta — como voce quer que eu me chame?",
    );
    return true;
  }

  if (pending.stage === "ask_assistant_name") {
    const ai = await interpretOnboardingAnswer("name", value).catch(() => null);
    const assistantName = ai?.value?.trim() || value;
    await updateOwnerDetails({ assistant_name: assistantName });
    await addMemoryItem("user_fact", `nome do assistente: ${assistantName}`);
    await setPending(threadId, {
      type: "OWNER_SETUP",
      stage: "ask_user_name",
      createdAt: new Date().toISOString(),
    });
    await sendSetup(
      isEnglish ? "Nice! And what should I call you?" : "Legal! E voce, como quer que eu te chame?",
    );
    return true;
  }

  if (pending.stage === "ask_user_name") {
    const ai = await interpretOnboardingAnswer("name", value).catch(() => null);
    const nameValue = ai?.value?.trim() || value;
    await updateOwnerDetails({ owner_name: nameValue });
    await addMemoryItem("user_fact", `nome preferido: ${nameValue}`);
    await setPending(threadId, {
      type: "OWNER_SETUP",
      stage: "ask_location",
      createdAt: new Date().toISOString(),
    });
    await sendSetup(
      isEnglish
        ? "And where are you from? Tell me your city and I'll sort out the timezone."
        : "E de onde voce e? Me fala sua cidade que eu ja ajusto o fuso horario.",
    );
    return true;
  }

  if (pending.stage === "ask_location") {
    const ai = await interpretOnboardingAnswer("location", value).catch(() => null);
    const location = ai?.city ? { city: ai.city, country: ai.country } : parseLocation(value);
    await updateOwnerDetails({ city: location.city, country: location.country });
    await addMemoryItem("user_fact", `cidade: ${location.city}`);
    if (location.country) {
      await addMemoryItem("user_fact", `pais: ${location.country}`);
    }
    let inferred = ai?.timezone ?? inferTimezoneFromLocation(location.city, location.country);
    if (inferred) {
      try {
        await setTimezone(inferred);
        await updateOwnerDetails({ timezone: inferred });
        await addMemoryItem("user_fact", `fuso horario: ${inferred}`);
      } catch {
        inferred = null;
      }
    }
    if (!inferred) {
      await setPending(threadId, {
        type: "OWNER_SETUP",
        stage: "ask_timezone",
        createdAt: new Date().toISOString(),
      });
      await sendSetup(
        isEnglish
          ? "I couldn't figure out the timezone from your city. What's your timezone? (e.g. America/Sao_Paulo)"
          : "Nao consegui detectar o fuso pela sua cidade. Qual e seu fuso horario? (ex: America/Sao_Paulo)",
      );
      return true;
    }
    await setPending(threadId, {
      type: "OWNER_SETUP",
      stage: "confirm_summary",
      createdAt: new Date().toISOString(),
    });
    await sendSetup(buildOnboardingSummary(await getOwnerState()));
    return true;
  }

  if (pending.stage === "ask_timezone") {
    const ai = await interpretOnboardingAnswer("timezone", value).catch(() => null);
    const confirmation = parseConfirmation(value);
    const inferred =
      owner?.timezone ??
      inferTimezoneFromLocation(owner?.city, owner?.country) ??
      normalizeTimezoneInput(value);
    const tz = confirmation === "confirm" && inferred ? inferred : ai?.timezone ?? normalizeTimezoneInput(value) ?? value;
    try {
      await setTimezone(tz);
      await updateOwnerDetails({ timezone: tz });
      await addMemoryItem("user_fact", `fuso horario: ${tz}`);
    } catch {
      await sendSetup(
        isEnglish
          ? "Hmm, I couldn't figure out that timezone. Can you try something like Europe/London or America/Sao_Paulo?"
          : "Hmm, nao consegui identificar esse fuso. Tenta algo como America/Sao_Paulo ou Europe/London?",
      );
      return true;
    }
    await setPending(threadId, {
      type: "OWNER_SETUP",
      stage: "confirm_summary",
      createdAt: new Date().toISOString(),
    });
    await sendSetup(buildOnboardingSummary(await getOwnerState()));
    return true;
  }

  if (pending.stage === "confirm_summary") {
    if (isPostSetupHelpRequest(value)) {
      await updateOwnerDetails({ setup_done: true });
      await clearPending(threadId);
      const freshOwner = await getOwnerState();
      const name = freshOwner?.owner_name ?? "por aqui";
      const assistantName = freshOwner?.assistant_name ?? assistantFallback;
      const message = [
        isEnglish ? "Sure, here's a quick intro:" : "Claro, olha o que eu sei fazer:",
        buildPostSetupHelp(),
        isEnglish ? "Want me to do something for you now?" : "Quer que eu ja faca algo pra voce?",
      ].join("\n");
      await sendSetup(message);
      return true;
    }
    const decision = parseConfirmation(value);
    if (decision === "confirm") {
      if (!owner?.owner_jid) {
        await setOwner(to);
      }
      await updateOwnerDetails({ setup_done: true });
      await clearPending(threadId);
      const freshOwner = await getOwnerState();
      const name = freshOwner?.owner_name ?? "por aqui";
      const assistantName = freshOwner?.assistant_name ?? assistantFallback;
      const finalLanguage = freshOwner?.language ?? language;
      await sendSetup(buildPostSetupIntro(name, assistantName, finalLanguage));
      return true;
    }
    const lower = value.toLowerCase();
    let nextStage: "ask_assistant_name" | "ask_user_name" | "ask_location" | "ask_timezone" =
      "ask_location";
    if (lower.includes("assistente") || lower.includes("seu nome") || lower.includes("se chama")) {
      nextStage = "ask_assistant_name";
    } else if (lower.includes("meu nome") || lower.includes("usuario") || lower.includes("nome")) {
      nextStage = "ask_user_name";
    } else if (lower.includes("fuso") || lower.includes("horario")) {
      nextStage = "ask_timezone";
    }
    if (lower.includes("corrigir") || lower.includes("ajustar")) {
      await setPending(threadId, {
        type: "OWNER_SETUP",
        stage: nextStage,
        createdAt: new Date().toISOString(),
      });
      await sendSetup(
        isEnglish
          ? "Sure thing. Tell me what you'd like to change."
          : "Sem problema. Me diz o que voce quer mudar.",
      );
    } else {
      await sendSetup(
        isEnglish
          ? "If something's off, just tell me what — my name, your name, city, or timezone."
          : "Se algo nao ta certo, me fala o que — meu nome, seu nome, cidade ou fuso horario.",
      );
    }
    return true;
  }

  return false;
}

async function handleStandaloneApiKey(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
): Promise<boolean> {
  const value = text.trim();
  const sendSetup = (msg: string) => sendAndLog(socket, to, threadId, msg, { polish: false });
  if (isLikelyAnthropicKey(value)) {
    await saveEnvValue("ANTHROPIC_API_KEY", value);
    process.env.ANTHROPIC_API_KEY = value;
    await addMemoryItem("decision", "ANTHROPIC_API_KEY atualizada via WhatsApp");
    await sendSetup("Chave da Anthropic salva! Posso continuar?");
    return true;
  }
  if (isLikelyXaiKey(value)) {
    await saveEnvValue("XAI_API_KEY", value);
    process.env.XAI_API_KEY = value;
    await addMemoryItem("decision", "XAI_API_KEY atualizada via WhatsApp");
    await sendSetup("Chave do Grok salva! Posso continuar?");
    return true;
  }
  return false;
}

async function handleStandaloneAnthropicKey(
  socket: WASocket,
  to: string,
  threadId: string,
  text: string,
): Promise<boolean> {
  const value = extractAnthropicKey(text) ?? text.trim();
  const sendSetup = (msg: string) => sendAndLog(socket, to, threadId, msg, { polish: false });
  if (!isLikelyAnthropicKey(value)) {
    return false;
  }
  await saveEnvValue("ANTHROPIC_API_KEY", value);
  process.env.ANTHROPIC_API_KEY = value;
  await addMemoryItem("decision", "Anthropic configurada (Sonnet)");
  await sendSetup("Chave da Anthropic salva. Posso continuar?");
  return true;
}
async function executeUpdate(
  socket: WASocket,
  to: string,
  threadId: string,
  updateScript: string,
): Promise<void> {
  await markUpdatePending(to);
  const output = await runScript(updateScript);
  const summary = parseUpdatedFiles(output);
  await sendAndLog(socket, to, threadId, `${summary} Reiniciando... Ja volto.`, { polish: false });
  setTimeout(() => process.exit(0), 1000);
}













