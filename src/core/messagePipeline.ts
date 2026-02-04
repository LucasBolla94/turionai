export type MessageIntent = "COMMAND" | "CHAT" | "UNKNOWN";

export interface MessageContext {
  text: string;
  from: string;
  sender: string;
  timestamp: number;
}

export interface MessageResult {
  intent: MessageIntent;
  command?: string;
  args?: string[];
}

const COMMAND_KEYWORDS = new Set([
  "status",
  "deploy",
  "cron",
  "logs",
  "run",
  "list",
  "help",
]);

const CHAT_KEYWORDS = new Set([
  "oi",
  "ola",
  "olá",
  "hello",
  "hi",
  "bom dia",
  "boa tarde",
  "boa noite",
  "tudo bem",
]);

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function classifyMessage(context: MessageContext): MessageResult {
  const normalized = normalizeText(context.text);
  if (!normalized) {
    return { intent: "UNKNOWN" };
  }

  const [firstToken, ...rest] = normalized.split(/\s+/);

  if (firstToken.startsWith("/")) {
    const command = firstToken.slice(1);
    return { intent: "COMMAND", command, args: rest };
  }

  if (COMMAND_KEYWORDS.has(firstToken)) {
    return { intent: "COMMAND", command: firstToken, args: rest };
  }

  for (const key of CHAT_KEYWORDS) {
    if (normalized.startsWith(key)) {
      return { intent: "CHAT" };
    }
  }

  return { intent: "UNKNOWN" };
}
