import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface UserStyle {
  preferred_language: string;
  response_detail: "short" | "medium" | "long";
  formality: "casual" | "neutral" | "formal";
  emoji_preference: "none" | "light";
}

const STYLE_DIR = resolve("state", "persona");
const STYLE_PATH = resolve(STYLE_DIR, "user_style.json");
const LEGACY_STYLE_DIR = resolve("state", "memory");
const LEGACY_STYLE_PATH = resolve(LEGACY_STYLE_DIR, "user_style.json");

const DEFAULT_STYLE: UserStyle = {
  preferred_language: "pt-BR",
  response_detail: "medium",
  formality: "neutral",
  emoji_preference: "light",
};

export async function getUserStyle(): Promise<UserStyle> {
  try {
    const data = await readFile(STYLE_PATH, "utf8");
    return JSON.parse(data) as UserStyle;
  } catch {
    try {
      const legacy = await readFile(LEGACY_STYLE_PATH, "utf8");
      const parsed = JSON.parse(legacy) as UserStyle;
      await saveUserStyle(parsed);
      return parsed;
    } catch {
      await saveUserStyle({ ...DEFAULT_STYLE });
      return { ...DEFAULT_STYLE };
    }
  }
}

export async function saveUserStyle(style: UserStyle): Promise<void> {
  await mkdir(STYLE_DIR, { recursive: true });
  await writeFile(STYLE_PATH, JSON.stringify(style, null, 2), "utf8");
}

export async function setUserStyle(
  patch: Partial<UserStyle>,
): Promise<UserStyle> {
  const current = await getUserStyle();
  const updated: UserStyle = { ...current, ...patch };
  await saveUserStyle(updated);
  return updated;
}
