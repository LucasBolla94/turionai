/**
 * All parse*, detect*, and build* functions for intent detection.
 * Pure functions - no side effects.
 */

import { CAPABILITIES, HELP_SECTIONS } from "../../config/capabilities";

export function parseRelativeReminder(text: string): { message: string; offsetMs: number } | null {
  const normalized = text.toLowerCase();
  if (!normalized.includes("lembre") && !normalized.includes("lembra")) {
    return null;
  }
  const match = normalized.match(/(?:daqui a? |em )(\d+)\s*(minuto|minutos|min|hora|horas|h)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2];
  const minutes = unit.startsWith("h") ? amount * 60 : amount;
  const offsetMs = minutes * 60_000;
  if (offsetMs <= 0) return null;

  let message = text;
  message = message.replace(match[0], "");
  message = message.replace(/me\s+lembre(?:\s+de)?/i, "");
  message = message.replace(/me\s+lembra(?:\s+de)?/i, "");
  message = message.replace(/lembre(?:\s+de)?/i, "");
  message = message.replace(/lembra(?:\s+de)?/i, "");
  message = message.replace(/\s+/g, " ").trim();
  if (!message) message = "Lembrete";
  return { message, offsetMs };
}

export function parseLocation(value: string): { city: string; country?: string } {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.includes(" em ")) {
    const parts = cleaned.split(" em ");
    const city = parts[parts.length - 1]?.trim();
    if (city) return { city };
  }
  if (cleaned.includes(",")) {
    const [city, country] = cleaned.split(",").map((part) => part.trim());
    return { city, country: country || undefined };
  }
  const tokens = cleaned.split(" ");
  if (tokens.length >= 2) {
    return { city: tokens.slice(0, -1).join(" "), country: tokens[tokens.length - 1] };
  }
  return { city: cleaned };
}

export function parseConfirmation(text: string): "confirm" | "cancel" | null {
  const normalized = text.trim().toLowerCase();
  const confirm = new Set([
    "confirmar", "sim", "ok", "confirmo", "isso", "isso mesmo",
    "isso ai", "isso aí", "acertou", "certo", "exato", "correto", "pode",
  ]);
  const cancel = new Set(["cancelar", "nao", "não", "cancela", "errado"]);
  if (confirm.has(normalized)) return "confirm";
  if (cancel.has(normalized)) return "cancel";
  return null;
}

export function parseUpdateRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  // Se menciona modelo/ia/claude/llm, nao e update de sistema
  if (parseModelUpdateQuestion(text)) return false;
  const hasUpdate =
    normalized.includes("atualiz") || normalized.includes("update") ||
    normalized.includes("faz o update") || normalized.includes("fazer update") ||
    normalized.includes("forca o update") || normalized.includes("forçar o update") ||
    normalized.includes("se atualiza") || normalized.includes("te atualiza") ||
    normalized.includes("mesmo assim");
  const hasTarget =
    normalized.includes("turion") || normalized.includes("sistema") ||
    normalized.includes("bot") || normalized.includes("agente") ||
    normalized.includes("voce") || normalized.includes("você");
  const hasVerb =
    normalized.includes("faz") || normalized.includes("fazer") ||
    normalized.includes("forca") || normalized.includes("forçar") ||
    normalized.includes("roda") || normalized.includes("rodar") ||
    normalized.includes("aplica") || normalized.includes("aplicar");
  return hasUpdate && (hasTarget || hasVerb || normalized.length < 20);
}

export function parseUpdateStatusRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasUpdate = normalized.includes("update") || normalized.includes("atualiza");
  const hasQuestion =
    normalized.includes("tem") || normalized.includes("novo") ||
    normalized.includes("?") || normalized.includes("existe");
  return hasUpdate && hasQuestion;
}

export function parseModelUpdateQuestion(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasModel =
    normalized.includes("modelo") || normalized.includes("grok") ||
    normalized.includes("ia") || normalized.includes("llm") ||
    normalized.includes("claude") || normalized.includes("anthropic") ||
    normalized.includes("inteligencia");
  const hasUpdate = normalized.includes("update") || normalized.includes("atualiza");
  return hasModel && hasUpdate;
}

export function buildModelUpdateExplanation(): string {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  return [
    "O modelo de IA (Claude) e um servico externo da Anthropic — eu nao faco update dele localmente.",
    "Modelo configurado agora: " + model + ".",
    "Se quiser trocar pra outro modelo, me diga qual e eu ajusto a configuracao.",
  ].join("\n");
}

export function parseApiStatusRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasApi =
    normalized.includes("api") || normalized.includes("anthropic") ||
    normalized.includes("claude") || normalized.includes("xai") ||
    normalized.includes("grok");
  const hasCheck =
    normalized.includes("conect") || normalized.includes("ok") ||
    normalized.includes("funcion") || normalized.includes("respond") ||
    normalized.includes("status");
  return hasApi && hasCheck;
}

export function parseUpdateCheckRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("checa de novo") ||
    normalized.includes("checar de novo") ||
    normalized.includes("verifica de novo")
  );
}

export function parseGitStatusRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasGit = normalized.includes("git") || normalized.includes("github");
  const hasConnect =
    normalized.includes("conectado") || normalized.includes("conectada") ||
    normalized.includes("conexao") || normalized.includes("conexão") ||
    normalized.includes("conectar");
  return hasGit && hasConnect;
}

export function parseEmailStatusRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    (normalized.includes("email") || normalized.includes("e-mail")) &&
    (normalized.includes("conect") || normalized.includes("ligado") || normalized.includes("pronto"))
  );
}

export function parseEmailAccessQuestion(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasEmail = normalized.includes("email") || normalized.includes("e-mail");
  const hasAccess =
    normalized.includes("acesso") || normalized.includes("tem acesso") ||
    /\bler\b/.test(normalized) || /\blê\b/.test(normalized) ||
    /\blesse\b/.test(normalized);
  return hasEmail && hasAccess;
}

export function parseEmailConnectRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasEmail = normalized.includes("email") || normalized.includes("e-mail");
  const hasConnect =
    normalized.includes("conectar") || normalized.includes("configurar") ||
    normalized.includes("ligar") || normalized.includes("vincular");
  return hasEmail && hasConnect;
}

export function parseEmailSecurityQuestion(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasEmail = normalized.includes("email") || normalized.includes("e-mail");
  const hasProvider = normalized.includes("gmail") || normalized.includes("icloud");
  const hasSecurity =
    normalized.includes("segur") || normalized.includes("senha") ||
    normalized.includes("app password") || normalized.includes("app-specific") ||
    normalized.includes("como funciona") || normalized.includes("por que") ||
    normalized.includes("porque");
  return hasSecurity && (hasEmail || hasProvider);
}

export function parseEmailProvider(text: string): "icloud" | "gmail" | null {
  const normalized = text.trim().toLowerCase();
  if (normalized === "icloud" || normalized.includes("icloud")) return "icloud";
  if (normalized === "gmail" || normalized.includes("gmail")) return "gmail";
  return null;
}

export function parseEmailPromoRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasPromo =
    normalized.includes("promo") || normalized.includes("newsletter") ||
    normalized.includes("newsletters") || normalized.includes("boletim") ||
    normalized.includes("marketing");
  const hasAsk =
    normalized.includes("quais") || normalized.includes("mostra") ||
    normalized.includes("ver") || normalized.includes("lista") ||
    normalized.includes("listar");
  return hasPromo && (hasAsk || normalized.length < 20);
}

export function parseRetryRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("de novo") || normalized.includes("novamente") ||
    normalized.includes("procura") || normalized.includes("procure") ||
    normalized.includes("checa de novo") || normalized.includes("checar de novo")
  );
}

export function isEmailListFollowup(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const hasEmail =
    normalized.includes("email") || normalized.includes("e-mail") ||
    normalized.includes("inbox") || normalized.includes("caixa");
  const hasMore =
    normalized.includes("mais") || normalized.includes("outros") ||
    normalized.includes("mostrar") || normalized.includes("mostra") ||
    normalized.includes("listar") || normalized.includes("lista");
  return hasMore && (hasEmail || normalized.includes("mais"));
}

export function parseTimeRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("que horas") || normalized.includes("horas são") ||
    normalized.includes("hora são") || normalized.includes("hora agora") ||
    normalized === "hora" || normalized === "horas"
  );
}

export function parseTimezoneRequest(
  text: string,
): { timeZone: string; label: string } | null {
  const normalized = text.toLowerCase();
  if (!/(fuso|hor[aá]rio|timezone)/.test(normalized)) return null;

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
    if (city.includes(key)) return value;
  }

  if (raw && raw.includes("/")) return { timeZone: raw.trim(), label: raw.trim() };
  return null;
}

export function parsePickIndex(text: string, max: number): number | null {
  const match = text.match(/\b(\d+)\b/);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isFinite(index)) return null;
  if (index < 1 || index > max) return null;
  return index - 1;
}

export function parseUpdatedFiles(output: string): string {
  const match = output.match(/(\d+)\s+files?\s+changed/i);
  if (match) return `Atualizando ${match[1]} arquivos...`;
  return "Atualizando arquivos...";
}

export function parseEmailCommandArgs(action: string, rest: string[]): Record<string, unknown> {
  if (action === "connect") {
    return { action: "connect", provider: rest[0], user: rest[1], password: rest.slice(2).join(" ") };
  }
  if (action === "list") {
    const limit = rest[0] ? Number(rest[0]) : 5;
    const mode = rest.includes("compact") || rest.includes("ver") ? "compact" : "summary";
    return { action: "list", limit, unreadOnly: true, mode };
  }
  if (action === "read") return { action: "read", id: Number(rest[0]) };
  if (action === "reply") return { action: "reply", id: Number(rest[0]), body: rest.slice(1).join(" ") };
  if (action === "explain") return { action: "explain", id: Number(rest[0]) };
  if (action === "draft") return { action: "draft_reply", id: Number(rest[0]), instruction: rest.slice(1).join(" ") };
  if (action === "delete") return { action: "delete", id: Number(rest[0]) };
  if (action === "monitor") return { action: "monitor" };
  return { action };
}

export function isPostSetupHelpRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("primeiros comandos") ||
    normalized.includes("o que voce faz") ||
    normalized.includes("o que vc faz") ||
    normalized.includes("como usar") ||
    normalized.includes("me mostra") ||
    normalized.includes("me mostra os comandos") ||
    normalized.includes("ajuda") ||
    normalized.includes("help")
  );
}

export function detectHelpTopic(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("icloud")) return "icloud";
  if (normalized.includes("gmail")) return "email";
  if (normalized.includes("email") || normalized.includes("e-mail")) return "email";
  if (normalized.includes("lembrete") || normalized.includes("cron")) return "lembretes";
  if (normalized.includes("update") || normalized.includes("atualiza")) return "update";
  if (normalized.includes("ajuda") || normalized.includes("help")) return "geral";
  if (normalized.includes("configura")) return "geral";
  return "geral";
}

export function buildPostSetupIntro(
  name: string,
  assistantName: string,
  language: string,
): string {
  if (language.startsWith("en")) {
    const lines = [
      `All set, ${name}! I'm configured and ready to help.`,
      "",
      "Here's what I can do for you:",
      buildPostSetupHelp(),
      "",
      "Want me to do something for you right now?",
    ];
    return lines.filter(Boolean).join("\n");
  }
  const lines = [
    `Pronto, ${name}! To configurado e pronto pra te ajudar.`,
    "",
    "Aqui vai o que eu sei fazer:",
    buildPostSetupHelp(),
    "",
    "Quer que eu ja faca algo pra voce?",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildPostSetupHelp(): string {
  const buckets = CAPABILITIES.map((category) => {
    const examples = category.items.slice(0, 2).map((item) => `- ${item}`);
    return [`${category.title}:`, ...examples].join("\n");
  });
  return buckets.join("\n");
}

export function buildHelpMessage(topic: string): string {
  const normalized = topic.toLowerCase();
  const section =
    HELP_SECTIONS.find((item) => normalized.includes(item.key)) ??
    HELP_SECTIONS.find((item) => item.key === "geral");
  if (!section) return "Posso explicar o que eu faço. Quer ajuda com email, lembretes ou update?";
  const lines = [
    section.title,
    section.description,
    "",
    ...section.steps.map((step) => `- ${step}`),
    "",
    "Exemplos:",
    ...section.examples.map((example) => `- ${example}`),
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildOnboardingSummary(owner: any): string {
  if (!owner) return "Hmm, ainda preciso de alguns detalhes pra finalizar.";
  const assistant = owner.assistant_name ?? "Tur";
  const name = owner.owner_name ?? "voce";
  const city = owner.city ?? "sua cidade";
  const country = owner.country ? `, ${owner.country}` : "";
  const timezone = owner.timezone ?? "UTC";
  const language = owner.language ?? "pt-BR";
  if (language.startsWith("en")) {
    return `Let me make sure I got everything:\n\nI'm ${assistant}, your personal assistant.\nYou're ${name}, based in ${city}${country}, timezone ${timezone}.\n\nDoes that look right?`;
  }
  return `Deixa eu ver se entendi tudo:\n\nEu sou o ${assistant}, seu assistente pessoal.\nVoce e o ${name}, mora em ${city}${country} e seu fuso e ${timezone}.\n\nTa tudo certo?`;
}

export function detectUserLanguage(text: string): "pt-BR" | "en-US" | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^\d{4,6}$/.test(trimmed)) return null;
  if (trimmed.startsWith("xai-")) return null;
  const normalized = trimmed.toLowerCase();
  if (/[ãáàâéêíóôõúç]/.test(normalized)) return "pt-BR";
  const ptHits = [
    "oi", "ola", "olá", "por favor", "obrigado", "lembrete",
    "me lembra", "agora", "amanha", "voce", "você",
  ].filter((token) => normalized.includes(token)).length;
  const enHits = [
    "hi", "hello", "please", "thanks", "reminder", "now", "tomorrow", "you",
  ].filter((token) => normalized.includes(token)).length;
  if (enHits > ptHits) return "en-US";
  if (ptHits > 0) return "pt-BR";
  return null;
}

export function buildEmailConnectIntro(): string {
  return [
    "Ainda nao tenho acesso ao seu email.",
    "Se voce quiser, posso conectar de forma segura.",
    "Opcoes: Gmail ou iCloud.",
    "Se preferir, eu explico com calma como funciona e por que usamos App Password.",
    "Qual voce quer usar?",
  ].join("\n");
}

export function buildIcloudStepsIntro(): string {
  return [
    "Perfeito. No iCloud, a Apple exige uma App-Specific Password (mais segura que a senha principal).",
    "Se quiser, eu explico o motivo e o passo a passo com calma.",
    "Passo rapido:",
    "1) appleid.apple.com > Sign-In and Security > App-Specific Passwords",
    "2) Generate Password (nome: Turion Assistant Mail)",
    "3) Copie a senha gerada (aparece uma vez)",
    "",
    "Agora me envie seu email @icloud.com.",
  ].join("\n");
}

export function randomUpdateBackMessage(): string {
  const messages = [
    "Opa, to de volta. Bora?",
    "Prontinho, voltei online.",
    "Voltei 0km haha. Em que seguimos?",
    "Tudo certo aqui, ja estou de volta.",
    "Ja voltei. Quer que eu faca mais algo?",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function pickUpdateFoundMessage(): string {
  const messages = [
    "Achei um update pro meu sistema. Vou aplicar agora e ja volto.",
    "Tem atualizacao do meu sistema pendente. Vou atualizar rapidinho.",
    "Atualizacao encontrada aqui no meu sistema. Vou aplicar e ja volto.",
    "Encontrei update do meu sistema. Vou atualizar e ja volto online.",
    "Preciso atualizar meu sistema agora. Enquanto roda, ja volto.",
    "Tem update do meu sistema para fazer. Vou aplicar e ja te aviso quando voltar.",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function resolveUpdateCheck(status: string): { kind: "available" | "up_to_date" | "error" | "unknown"; message?: string } {
  if (status.includes("UPDATE_AVAILABLE")) return { kind: "available" };
  if (status.includes("UP_TO_DATE")) return { kind: "up_to_date" };
  if (status.includes("GIT_NOT_FOUND")) return { kind: "error", message: "Git nao esta instalado no ambiente. Nao consigo checar update agora." };
  if (status.includes("NOT_A_GIT_REPO")) return { kind: "error", message: "Nao encontrei um repositorio git configurado aqui." };
  if (status.includes("NO_REMOTE")) return { kind: "error", message: "Repositorio sem remote origin configurado. Nao consigo checar update." };
  if (status.includes("FETCH_FAILED")) return { kind: "error", message: "Falha ao buscar updates no remoto. Tente novamente mais tarde." };
  if (status.includes("NO_REMOTE_MAIN")) return { kind: "error", message: "Nao encontrei origin/main no remoto." };
  return { kind: "unknown" };
}
