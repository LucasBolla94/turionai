import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

interface InteractionState {
  lastThread?: string;
  lastJid?: string;
  lastSentDate?: string;
  lastInteractionAt?: string;
}

const INTERACTION_DIR = resolve("state", "memory");
const INTERACTION_PATH = resolve(INTERACTION_DIR, "interaction.json");

export async function recordInteraction(threadId: string, jid: string): Promise<void> {
  const state: InteractionState = {
    lastThread: threadId,
    lastJid: jid,
    lastInteractionAt: new Date().toISOString(),
  };
  await mkdir(INTERACTION_DIR, { recursive: true });
  await writeFile(INTERACTION_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function getInteractionState(): Promise<InteractionState> {
  try {
    const data = await readFile(INTERACTION_PATH, "utf8");
    return JSON.parse(data) as InteractionState;
  } catch {
    return {};
  }
}

export async function markCheckinSent(): Promise<void> {
  const state = await getInteractionState();
  state.lastSentDate = new Date().toISOString().slice(0, 10);
  await mkdir(INTERACTION_DIR, { recursive: true });
  await writeFile(INTERACTION_PATH, JSON.stringify(state, null, 2), "utf8");
}
