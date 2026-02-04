import { formatReply, getBehaviorProfile, type BehaviorProfile } from "../behavior";
import { humanizeReply } from "../brain";
import { getUserStyle, setUserStyle, type UserStyle } from "./userStyle";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type ReplyTemplates = {
  acknowledgements: string[];
  closings: string[];
  guidance: string[];
};

const TEMPLATE_PATH = resolve("scripts", "human_reply_templates.json");
const STATE_DIR = resolve("state", "persona");
const STATE_PATH = resolve(STATE_DIR, "human_reply_state.json");

async function loadTemplates(): Promise<ReplyTemplates | null> {
  try {
    const data = await readFile(TEMPLATE_PATH, "utf8");
    return JSON.parse(data) as ReplyTemplates;
  } catch {
    return null;
  }
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

async function loadLastReplyHash(): Promise<string | null> {
  try {
    const data = await readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(data) as { last_hash?: string };
    return parsed.last_hash ?? null;
  } catch {
    return null;
  }
}

async function saveLastReplyHash(hash: string): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const payload = { last_hash: hash, updated_at: new Date().toISOString() };
  await writeFile(STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

function mergeBehaviorWithStyle(
  behavior: BehaviorProfile,
  style: UserStyle,
): BehaviorProfile {
  const merged: BehaviorProfile = { ...behavior };
  if (style.response_detail) {
    merged.verbosity = style.response_detail;
  }
  if (style.formality) {
    merged.formality = style.formality;
  }
  if (style.emoji_preference === "none") {
    merged.emoji_level = 0;
  }
  return merged;
}

export async function polishReply(text: string): Promise<string> {
  const [behavior, style] = await Promise.all([getBehaviorProfile(), getUserStyle()]);
  const merged = mergeBehaviorWithStyle(behavior, style);
  let reply = text.trim();
  if (merged.ai_polish && process.env.XAI_API_KEY) {
    const templates = await loadTemplates();
    const lastHash = await loadLastReplyHash();
    let seed = Math.floor(Math.random() * 1_000_000);
    try {
      let aiReply = await humanizeReply({
        text: reply,
        profile: merged,
        templates,
        seed,
        last_hash: lastHash ?? undefined,
      });
      if (aiReply && lastHash && hashText(aiReply) === lastHash) {
        seed += 1;
        aiReply = await humanizeReply({
          text: reply,
          profile: merged,
          templates,
          seed,
          last_hash: lastHash,
        });
      }
      if (aiReply) {
        reply = aiReply;
      }
    } catch {
      // fallback to original reply
    }
  }
  const formatted = formatReply(reply, merged);
  const newHash = hashText(formatted);
  await saveLastReplyHash(newHash).catch(() => undefined);
  return formatted;
}

export async function syncStyleFromBehavior(): Promise<void> {
  const behavior = await getBehaviorProfile();
  const desired: Partial<UserStyle> = {
    response_detail: behavior.verbosity,
    formality: behavior.formality,
    emoji_preference: behavior.emoji_level > 0 ? "light" : "none",
  };
  await setUserStyle(desired);
}
