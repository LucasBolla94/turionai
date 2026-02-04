import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type EmailRuleType = "sender" | "domain" | "keyword";
export type EmailImportance = "alta" | "media" | "baixa";
export type EmailUrgency = "alta" | "media" | "baixa";

export interface EmailRule {
  type: EmailRuleType;
  value: string;
  importance: EmailImportance;
  urgency: EmailUrgency;
  action?: "ignore";
}

interface RulesFile {
  rules: EmailRule[];
  updatedAt: string;
}

const RULES_DIR = resolve("state", "memory");
const RULES_PATH = resolve(RULES_DIR, "email_rules.json");

async function loadRulesFile(): Promise<RulesFile> {
  try {
    const data = await readFile(RULES_PATH, "utf8");
    return JSON.parse(data) as RulesFile;
  } catch {
    return { rules: [], updatedAt: new Date().toISOString() };
  }
}

async function saveRulesFile(file: RulesFile): Promise<void> {
  await mkdir(RULES_DIR, { recursive: true });
  file.updatedAt = new Date().toISOString();
  await writeFile(RULES_PATH, JSON.stringify(file, null, 2), "utf8");
}

export async function addEmailRule(rule: EmailRule): Promise<void> {
  const file = await loadRulesFile();
  const exists = file.rules.find(
    (r) => r.type === rule.type && r.value.toLowerCase() === rule.value.toLowerCase(),
  );
  if (!exists) {
    file.rules.push(rule);
    await saveRulesFile(file);
  }
}

export async function getEmailRules(): Promise<EmailRule[]> {
  const file = await loadRulesFile();
  return file.rules;
}

export function matchRule(
  rules: EmailRule[],
  sender: string,
  subject: string,
): EmailRule | null {
  const senderLower = sender.toLowerCase();
  const subjectLower = subject.toLowerCase();

  for (const rule of rules) {
    const value = rule.value.toLowerCase();
    if (rule.type === "sender" && senderLower.includes(value)) return rule;
    if (rule.type === "domain" && senderLower.includes(value)) return rule;
    if (rule.type === "keyword" && subjectLower.includes(value)) return rule;
  }
  return null;
}

export function extractEmailDomain(sender: string): string | null {
  const match = sender.match(/@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  return match ? match[1].toLowerCase() : null;
}
