/**
 * Pure utility functions - no side effects, no socket dependency.
 */

export function normalizeJid(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function isLikelyXaiKey(value: string): boolean {
  return /^xai-[A-Za-z0-9]{20,}$/.test(value.trim());
}

export function extractAnthropicKey(text: string): string | null {
  const match = text.match(/sk-ant-[A-Za-z0-9-_]{10,}/);
  return match ? match[0] : null;
}

export function isLikelyAnthropicKey(value: string): boolean {
  return /^sk-ant-[A-Za-z0-9-_]{10,}$/.test(value.trim());
}

export function userMentionsEmail(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("email") ||
    normalized.includes("e-mail") ||
    normalized.includes("inbox") ||
    normalized.includes("caixa") ||
    normalized.includes("não lido") ||
    normalized.includes("nao lido") ||
    normalized.includes("newsletter") ||
    normalized.includes("promo")
  );
}

export function isRecentTimestamp(value?: string, minutes = 30): boolean {
  if (!value) return false;
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return false;
  const deltaMs = Date.now() - ts;
  return deltaMs >= 0 && deltaMs <= minutes * 60_000;
}

export function stripEmailContent(reply: string): string {
  const lines = reply.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const normalized = line.toLowerCase();
    if (
      normalized.includes("email") ||
      normalized.includes("e-mail") ||
      normalized.includes("inbox") ||
      normalized.includes("não lido") ||
      normalized.includes("nao lido") ||
      normalized.includes("newsletter") ||
      normalized.includes("promo")
    ) {
      return false;
    }
    return true;
  });
  return filtered.join("\n").trim();
}

export function sameOwner(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const aNum = normalizeJid(a);
  const bNum = normalizeJid(b);
  return aNum.length > 6 && aNum === bNum;
}

export function extractQuotedText(message: any): string | null {
  const quoted =
    message?.message?.extendedTextMessage?.contextInfo?.quotedMessage ??
    message?.message?.contextInfo?.quotedMessage;
  if (!quoted) return null;
  return (
    quoted.conversation ??
    quoted.extendedTextMessage?.text ??
    quoted.imageMessage?.caption ??
    null
  );
}

export function safeJson<T = Record<string, unknown>>(payload: string): T | null {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export function sanitizeConversationText(
  text: string,
  pending: { type: string; stage?: string } | null,
): string {
  const lowered = text.toLowerCase();
  const sensitiveHints = ["app password", "senha", "password", "email connect"];
  if (isLikelyXaiKey(text.trim())) {
    return "[redacted]";
  }
  if (pending?.type === "EMAIL_CONNECT_FLOW" && pending.stage === "await_password") {
    return "[redacted]";
  }
  if (sensitiveHints.some((hint) => lowered.includes(hint))) {
    return "[redacted]";
  }
  return text;
}

export function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

export function shortEmailSubject(value: string): string {
  if (value.length <= 50) return value;
  return `${value.slice(0, 47)}...`;
}

export function enforceResponseStructure(reply: string): string {
  const cleaned = reply.trim();
  if (!cleaned) return reply;
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  const ackPattern = /^(ok|certo|entendi|beleza|claro|perfeito|feito|tranquilo|vamos|bom|pronto)/i;
  if (!ackPattern.test(lines[0])) {
    lines.unshift("Entendi.");
  }
  return lines.join("\n");
}

export function extractSenderHint(text: string): string | null {
  const normalized = text.toLowerCase();
  const match = normalized.match(/\b(do|da|de|from)\s+([a-z0-9@._-]{3,})/);
  if (!match) return null;
  return match[2];
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function truncateLogs(input: string): string {
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

export function extractCleanupSuggestion(
  output: string,
): { text: string; items: Array<{ id: number; sender: string }> } | null {
  const marker = output.match(/\[\[CLEANUP:([^\]]+)\]\]/);
  if (!marker) return null;
  const items: Array<{ id: number; sender: string }> = [];
  const payload = marker[1];
  for (const part of payload.split(";")) {
    const [idRaw, senderRaw] = part.split("|");
    const id = Number(idRaw);
    if (!id || !senderRaw) continue;
    items.push({ id, sender: senderRaw.trim() });
  }
  const text = output.replace(marker[0], "").trim();
  return items.length ? { text, items } : null;
}

export function buildPromoListMessage(
  items: Array<{ id: number; sender: string; subject: string }>,
): string {
  const lines = items.slice(0, 10).map((item) => `#${item.id} ${item.sender} — ${item.subject}`);
  return [
    "Esses parecem newsletters/promos:",
    "",
    ...lines,
    "",
    "Quer apagar algum? Me diga os IDs (ex: 123, 456) ou diga 'apagar todos'.",
  ].join("\n");
}

export function buildEmailDeletePrompt(items: Array<{ id: number; sender: string; subject: string }>): string {
  const lines = items.map(
    (item) => `#${item.id} ${item.sender} - ${shortEmailSubject(item.subject)}`,
  );
  const header =
    items.length === 1
      ? "So confirmando: posso apagar este email?"
      : "So confirmando: posso apagar estes emails?";
  return [header, "", ...lines, "", "Me responde com 'sim' ou 'nao'."]
    .filter(Boolean)
    .join("\n");
}

export function buildEmailPickPrompt(items: Array<{ id: number; sender: string; subject: string }>): string {
  const lines = items.map(
    (item, index) => `${index + 1} ${item.sender} — ${shortEmailSubject(item.subject)}`,
  );
  return [
    "Encontrei mais de um email com esse nome.",
    "Qual deles devo apagar? Responde com 1, 2, 3...",
    "",
    ...lines,
  ].join("\n");
}

export function matchItemsByKeyword(
  text: string,
  items: Array<{ id: number; sender: string; subject: string }>,
): Array<{ id: number; sender: string; subject: string }> {
  const stopwords = new Set([
    "apaga", "apague", "deleta", "delete", "remova", "remover",
    "exclui", "excluir", "apagar", "deletar", "email", "e-mail",
    "emails", "o", "a", "os", "as", "do", "da", "de", "dos", "das",
    "pra", "para", "por", "porfavor", "favor", "tambem", "esse",
    "essa", "esses", "essas", "sim",
  ]);
  const tokens = text
    .replace(/[^\w\s@.-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopwords.has(token));
  if (tokens.length === 0) return [];
  let maxScore = 0;
  const scored = items.map((item) => {
    const target = `${item.sender} ${item.subject}`.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (target.includes(token)) score += 1;
    }
    if (score > maxScore) maxScore = score;
    return { item, score };
  });
  if (maxScore === 0) return [];
  return scored.filter((entry) => entry.score === maxScore).map((entry) => entry.item);
}

export function resolveEmailDeleteTargets(
  text: string,
  items: Array<{ id: number; sender: string; subject: string; category?: string }>,
): { items: Array<{ id: number; sender: string; subject: string }>; needsPick: boolean } | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;
  const deleteVerb = /(apaga|apague|deleta|delete|remova|remover|exclui|excluir|apagar|deletar)/;
  if (!deleteVerb.test(normalized)) return null;
  const hasEmailWord =
    normalized.includes("email") || normalized.includes("e-mail") || normalized.includes("inbox") || normalized.includes("caixa");
  const mentionPromo =
    normalized.includes("promo") || normalized.includes("newsletter") ||
    normalized.includes("notifica") || normalized.includes("marketing");
  const mentionAll = normalized.includes("todos") || normalized.includes("todas");
  const countTwo =
    normalized.includes("os dois") || normalized.includes("as duas") ||
    normalized.includes("dois") || normalized.includes("duas") || normalized.includes(" 2 ");

  const ids = Array.from(normalized.matchAll(/#?\b(\d{3,})\b/g)).map((m) => Number(m[1]));
  if (ids.length > 0) {
    const matches = items.filter((item) => ids.includes(item.id));
    return { items: matches, needsPick: false };
  }

  const senderHint = extractSenderHint(normalized);
  if (senderHint) {
    const matches = items.filter((item) =>
      `${item.sender} ${item.subject}`.toLowerCase().includes(senderHint),
    );
    if (matches.length > 0) {
      return { items: matches, needsPick: matches.length > 1 && !mentionAll };
    }
  }

  let base = items;
  if (mentionPromo) {
    base = items.filter((item) =>
      ["promo", "newsletter", "spam"].includes(item.category ?? ""),
    );
  }

  const keywordMatches = matchItemsByKeyword(normalized, base);
  const candidates = keywordMatches.length > 0 ? keywordMatches : base;
  if (candidates.length === 0) return { items: [], needsPick: false };

  if (countTwo) return { items: candidates.slice(0, 2), needsPick: false };
  if (mentionAll || mentionPromo) return { items: candidates, needsPick: false };
  if (!hasEmailWord && keywordMatches.length === 0) return null;
  if (keywordMatches.length > 1) return { items: keywordMatches, needsPick: true };
  return { items: candidates.slice(0, 1), needsPick: false };
}

export function normalizeEmailArgs(
  intent: string,
  args: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
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
    action: actionMap[intent] ?? (args.action as string | null),
    ...args,
  } as Record<string, string | number | boolean | null>;
}
