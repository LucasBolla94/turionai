import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface BehaviorProfile {
  tone: "friendly" | "neutral";
  formality: "casual" | "neutral" | "formal";
  emoji_level: number;
  humor: "light" | "none";
  verbosity: "short" | "medium" | "long";
}

export interface EmotionState {
  mood: "neutral" | "positive";
  energy: number;
  last_interaction: string;
}

const BEHAVIOR_DIR = resolve("state", "memory");
const BEHAVIOR_PATH = resolve(BEHAVIOR_DIR, "behavior_profile.json");
const EMOTION_PATH = resolve(BEHAVIOR_DIR, "emotion_state.json");

const DEFAULT_BEHAVIOR: BehaviorProfile = {
  tone: "friendly",
  formality: "neutral",
  emoji_level: 0.2,
  humor: "light",
  verbosity: "medium",
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
    return { ...DEFAULT_BEHAVIOR };
  }
}

async function saveBehavior(profile: BehaviorProfile): Promise<void> {
  await mkdir(BEHAVIOR_DIR, { recursive: true });
  await writeFile(BEHAVIOR_PATH, JSON.stringify(profile, null, 2), "utf8");
}

export async function getBehaviorProfile(): Promise<BehaviorProfile> {
  return loadBehavior();
}

export async function applyFeedback(text: string): Promise<BehaviorProfile | null> {
  const normalized = text.toLowerCase();
  const profile = await loadBehavior();
  let changed = false;

  if (normalized.includes("mais curto") || normalized.includes("responde curto")) {
    profile.verbosity = "short";
    changed = true;
  }
  if (normalized.includes("mais longo") || normalized.includes("detalha")) {
    profile.verbosity = "long";
    changed = true;
  }
  if (normalized.includes("sem emoji") || normalized.includes("não usa emoji")) {
    profile.emoji_level = 0;
    changed = true;
  }
  if (normalized.includes("pode usar emoji") || normalized.includes("com emoji")) {
    profile.emoji_level = 0.2;
    changed = true;
  }
  if (normalized.includes("mais formal")) {
    profile.formality = "formal";
    changed = true;
  }
  if (normalized.includes("mais casual") || normalized.includes("mais informal")) {
    profile.formality = "casual";
    changed = true;
  }

  if (!changed) return null;
  await saveBehavior(profile);
  return profile;
}

export function formatReply(text: string, profile: BehaviorProfile): string {
  let reply = text.trim();
  if (profile.verbosity === "short") {
    const lines = reply.split("\n");
    reply = lines.slice(0, 4).join("\n");
  }
  if (profile.emoji_level <= 0) {
    reply = reply.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  }
  return reply.trim();
}

export async function touchEmotionState(): Promise<void> {
  const state: EmotionState = {
    ...DEFAULT_EMOTION,
    last_interaction: new Date().toISOString(),
  };
  await mkdir(BEHAVIOR_DIR, { recursive: true });
  await writeFile(EMOTION_PATH, JSON.stringify(state, null, 2), "utf8");
}
