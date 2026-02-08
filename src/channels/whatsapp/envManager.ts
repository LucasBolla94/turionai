/**
 * Environment variable management - .env read/write, validation.
 */

import { resolve } from "node:path";

const ALLOWED_ENV_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "XAI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "TURION_XAI_MODEL",
]);

export function extractEnvUpdates(text: string): Record<string, string> {
  const updates: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const envKey = key.trim();
    if (!ALLOWED_ENV_KEYS.has(envKey)) continue;
    const value = rest.join("=").trim();
    if (!value) continue;
    updates[envKey] = value;
  }
  return updates;
}

export function isEnvUpdateRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!normalized.includes("=")) return false;
  if (/(adicione|adicionar|adiciona|coloca|coloque|preencha|seta|setar|add)/.test(normalized)) {
    return true;
  }
  return Object.keys(extractEnvUpdates(text)).length > 0;
}

export function validateEnvValue(key: string, value: string): string | null {
  if (!value.trim()) return "valor vazio";
  if (key === "SUPABASE_URL" && !/^https?:\/\//i.test(value)) {
    return "SUPABASE_URL invalida (use https://...)";
  }
  if (key === "ANTHROPIC_API_KEY" && !value.startsWith("sk-ant-")) {
    return "ANTHROPIC_API_KEY invalida (deve comecar com sk-ant-)";
  }
  if (key === "XAI_API_KEY" && !value.startsWith("xai-")) {
    return "XAI_API_KEY invalida (deve comecar com xai-)";
  }
  return null;
}

export async function saveEnvValue(key: string, value: string): Promise<void> {
  const envPath = resolve(".env");
  const fs = await import("node:fs/promises");
  try {
    const current = await fs.readFile(envPath, "utf8");
    const lines = current.split(/\r?\n/);
    let found = false;
    const next = lines.map((line) => {
      if (line.startsWith(`${key}=`)) {
        found = true;
        return `${key}=${value}`;
      }
      return line;
    });
    if (!found) {
      next.push(`${key}=${value}`);
    }
    await fs.writeFile(envPath, next.join("\n"), "utf8");
  } catch {
    try {
      await fs.writeFile(envPath, `${key}=${value}\n`, "utf8");
    } catch {
      console.warn(`[env] Nao foi possivel salvar ${key} em ${envPath}. Definido apenas em memoria.`);
    }
  }
  // Always set in process.env so the value is available even if file write failed
  process.env[key] = value;
}

export async function applyEnvUpdates(
  updates: Record<string, string>,
): Promise<{ applied: string[]; errors: string[] }> {
  const applied: string[] = [];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const error = validateEnvValue(key, value);
    if (error) {
      errors.push(`${key}: ${error}`);
      continue;
    }
    await saveEnvValue(key, value);
    process.env[key] = value;
    applied.push(key);
  }
  return { applied, errors };
}
