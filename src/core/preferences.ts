import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface UserPreferences {
  preferred_language: string;
  avg_message_length: "short" | "medium" | "long";
  emoji_usage: boolean;
  formality: "casual" | "neutral" | "formal";
  common_phrases: string[];
}

const PREF_DIR = resolve("state", "memory");
const PREF_PATH = resolve(PREF_DIR, "preferences.json");

const DEFAULT_PREFS: UserPreferences = {
  preferred_language: "pt-BR",
  avg_message_length: "medium",
  emoji_usage: true,
  formality: "neutral",
  common_phrases: [],
};

async function loadPrefs(): Promise<UserPreferences> {
  try {
    const data = await readFile(PREF_PATH, "utf8");
    return JSON.parse(data) as UserPreferences;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

async function savePrefs(prefs: UserPreferences): Promise<void> {
  await mkdir(PREF_DIR, { recursive: true });
  await writeFile(PREF_PATH, JSON.stringify(prefs, null, 2), "utf8");
}

export async function updatePreferencesFromMessage(text: string): Promise<void> {
  const prefs = await loadPrefs();
  const lower = text.toLowerCase();
  let changed = false;

  if (lower.includes("responde curto") || lower.includes("mais curto")) {
    prefs.avg_message_length = "short";
    changed = true;
  }
  if (lower.includes("responde longo") || lower.includes("mais longo") || lower.includes("detalha")) {
    prefs.avg_message_length = "long";
    changed = true;
  }
  if (lower.includes("sem emoji") || lower.includes("nao usa emoji")) {
    prefs.emoji_usage = false;
    changed = true;
  }
  if (lower.includes("pode usar emoji") || lower.includes("com emoji")) {
    prefs.emoji_usage = true;
    changed = true;
  }
  if (lower.includes("mais formal")) {
    prefs.formality = "formal";
    changed = true;
  }
  if (lower.includes("mais casual") || lower.includes("mais informal")) {
    prefs.formality = "casual";
    changed = true;
  }

  const phrases = ["blz", "beleza", "fechado", "manda bala", "top", "valeu"];
  for (const phrase of phrases) {
    if (lower.includes(phrase) && !prefs.common_phrases.includes(phrase)) {
      prefs.common_phrases.push(phrase);
      changed = true;
    }
  }

  if (changed) {
    await savePrefs(prefs);
  }
}

export async function getPreferences(): Promise<UserPreferences> {
  return loadPrefs();
}
