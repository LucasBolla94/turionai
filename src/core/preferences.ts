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
  const length = text.trim().length;
  if (length <= 30) prefs.avg_message_length = "short";
  else if (length >= 120) prefs.avg_message_length = "long";
  else prefs.avg_message_length = "medium";

  const hasEmoji = /[\u{1F300}-\u{1FAFF}]/u.test(text);
  prefs.emoji_usage = hasEmoji ? true : prefs.emoji_usage;

  const lower = text.toLowerCase();
  const phrases = ["blz", "beleza", "fechado", "manda bala", "top", "valeu"];
  for (const phrase of phrases) {
    if (lower.includes(phrase) && !prefs.common_phrases.includes(phrase)) {
      prefs.common_phrases.push(phrase);
    }
  }

  await savePrefs(prefs);
}

export async function getPreferences(): Promise<UserPreferences> {
  return loadPrefs();
}
