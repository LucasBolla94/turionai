import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function stripQuotes(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function loadEnvFromFile(envPath = resolve(".env")): void {
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = stripQuotes(trimmed.slice(eq + 1).trim());
    if (!key) continue;
    const current = process.env[key];
    if (current === undefined || current === "") {
      process.env[key] = value;
    }
  }
}

loadEnvFromFile();
