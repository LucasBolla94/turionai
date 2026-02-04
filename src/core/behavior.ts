import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface BehaviorProfile {
  tone: "friendly" | "neutral";
  formality: "casual" | "neutral" | "formal";
  emoji_level: number;
  humor: "light" | "none";
  verbosity: "short" | "medium" | "long";
  ai_polish: boolean;
}

export interface EmotionState {
  mood: "calm" | "focused" | "enthusiastic" | "neutral";
  energy: number;
  last_interaction: string;
}

const BEHAVIOR_DIR = resolve("state", "persona");
const BEHAVIOR_PATH = resolve(BEHAVIOR_DIR, "behavior_profile.json");
const EMOTION_PATH = resolve(BEHAVIOR_DIR, "emotion_state.json");
const LEGACY_DIR = resolve("state", "memory");
const LEGACY_BEHAVIOR_PATH = resolve(LEGACY_DIR, "behavior_profile.json");
const LEGACY_EMOTION_PATH = resolve(LEGACY_DIR, "emotion_state.json");

const DEFAULT_BEHAVIOR: BehaviorProfile = {
  tone: "friendly",
  formality: "neutral",
  emoji_level: 0.1,
  humor: "none",
  verbosity: "short",
  ai_polish: true,
};

const DEFAULT_EMOTION: EmotionState = {
  mood: "neutral",
  energy: 0.6,
  last_interaction: new Date().toISOString(),
};

async function loadBehavior(): Promise<BehaviorProfile> {
  try {
    const data = await readFile(BEHAVIOR_PATH, "utf8");
    return JSON.parse(data) as BehaviorProfile;
  } catch {
    // try legacy path and migrate
    try {
      const legacy = await readFile(LEGACY_BEHAVIOR_PATH, "utf8");
      const parsed = JSON.parse(legacy) as BehaviorProfile;
      await saveBehavior(parsed);
      return parsed;
    } catch {
      await saveBehavior({ ...DEFAULT_BEHAVIOR });
      return { ...DEFAULT_BEHAVIOR };
    }
  }
}

async function saveBehavior(profile: BehaviorProfile): Promise<void> {
  await mkdir(BEHAVIOR_DIR, { recursive: true });
  await writeFile(BEHAVIOR_PATH, JSON.stringify(profile, null, 2), "utf8");
}

export async function getBehaviorProfile(): Promise<BehaviorProfile> {
  return loadBehavior();
}

export async function setBehaviorProfile(
  patch: Partial<BehaviorProfile>,
): Promise<BehaviorProfile> {
  const profile = await loadBehavior();
  const updated: BehaviorProfile = { ...profile, ...patch };
  await saveBehavior(updated);
  return updated;
}

export async function applyFeedback(
  text: string,
): Promise<{ profile: BehaviorProfile; memoryText?: string } | null> {
  const normalized = text.toLowerCase();
  const profile = await loadBehavior();
  let changed = false;
  let memoryText: string | undefined;

  if (normalized.includes("mais curto") || normalized.includes("responde curto")) {
    profile.verbosity = "short";
    changed = true;
    memoryText = "prefere respostas curtas";
  }
  if (normalized.includes("mais longo") || normalized.includes("detalha")) {
    profile.verbosity = "long";
    changed = true;
    memoryText = "prefere respostas mais detalhadas";
  }
  if (normalized.includes("sem emoji") || normalized.includes("não usa emoji")) {
    profile.emoji_level = 0;
    changed = true;
    memoryText = "prefere sem emoji";
  }
  if (normalized.includes("pode usar emoji") || normalized.includes("com emoji")) {
    profile.emoji_level = 0.2;
    changed = true;
    memoryText = "aceita emojis com moderação";
  }
  if (normalized.includes("mais formal")) {
    profile.formality = "formal";
    changed = true;
    memoryText = "prefere tom formal";
  }
  if (normalized.includes("mais casual") || normalized.includes("mais informal")) {
    profile.formality = "casual";
    changed = true;
    memoryText = "prefere tom casual";
  }

  if (!changed) return null;
  await saveBehavior(profile);
  return { profile, memoryText };
}

export function formatReply(text: string, profile: BehaviorProfile): string {
  let reply = text.trim();
  if (profile.verbosity === "short") {
    const lines = reply.split("\n");
    reply = lines.slice(0, 4).join("\n");
  }
  if (profile.emoji_level <= 0 || profile.formality !== "casual") {
    reply = reply.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  } else {
    const matches = reply.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? [];
    if (matches.length > 1) {
      let count = 0;
      reply = reply.replace(/[\u{1F300}-\u{1FAFF}]/gu, (match) => {
        count += 1;
        return count === 1 ? match : "";
      });
    }
  }
  return reply.trim();
}

export async function touchEmotionState(): Promise<void> {
  const state: EmotionState = {
    ...DEFAULT_EMOTION,
    last_interaction: new Date().toISOString(),
  };
  await mkdir(BEHAVIOR_DIR, { recursive: true });
  try {
    await writeFile(EMOTION_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // fallback to legacy path if needed
    await mkdir(LEGACY_DIR, { recursive: true });
    await writeFile(LEGACY_EMOTION_PATH, JSON.stringify(state, null, 2), "utf8");
  }
}

export async function migrateLegacyEmotionState(): Promise<void> {
  try {
    await readFile(EMOTION_PATH, "utf8");
    return;
  } catch {
    // continue
  }
  try {
    const legacy = await readFile(LEGACY_EMOTION_PATH, "utf8");
    await mkdir(BEHAVIOR_DIR, { recursive: true });
    await writeFile(EMOTION_PATH, legacy, "utf8");
  } catch {
    return;
  }
}
