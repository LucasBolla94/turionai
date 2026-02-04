import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface TimeSettings {
  timezone: string;
}

const DEFAULT_TZ = "UTC";
const SETTINGS_DIR = resolve("state", "memory");
const SETTINGS_PATH = resolve(SETTINGS_DIR, "settings.json");

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezoneInput(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  const mapping: Record<string, string> = {
    londres: "Europe/London",
    london: "Europe/London",
    lisboa: "Europe/Lisbon",
    lisbon: "Europe/Lisbon",
    portugal: "Europe/Lisbon",
    uk: "Europe/London",
    "reino unido": "Europe/London",
    "sao paulo": "America/Sao_Paulo",
    "são paulo": "America/Sao_Paulo",
    brasilia: "America/Sao_Paulo",
    "rio de janeiro": "America/Sao_Paulo",
  };
  for (const [key, tz] of Object.entries(mapping)) {
    if (normalized.includes(key)) {
      return tz;
    }
  }
  if (raw.includes("/")) return raw;
  return null;
}

export async function getTimezone(): Promise<string> {
  try {
    const data = await readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(data) as TimeSettings;
    if (parsed?.timezone && isValidTimeZone(parsed.timezone)) {
      return parsed.timezone;
    }
  } catch {
    // ignore
  }
  return process.env.TURION_TIMEZONE || DEFAULT_TZ;
}

export async function setTimezone(timeZone: string): Promise<void> {
  if (!isValidTimeZone(timeZone)) {
    throw new Error("Fuso horário inválido.");
  }
  await mkdir(SETTINGS_DIR, { recursive: true });
  const payload: TimeSettings = { timezone: timeZone };
  await writeFile(SETTINGS_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export async function getCurrentTimeString(): Promise<string> {
  const timeZone = await getTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return formatter.format(now);
}
