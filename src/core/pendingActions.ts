import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type PendingAction =
  | {
      type: "RUN_SKILL";
      intent: string;
      args: Record<string, string | number | boolean | null>;
      createdAt: string;
    }
  | {
      type: "RUN_UPDATE";
      createdAt: string;
    }
  | {
      type: "RUN_PLAN";
      plan: Array<{ skill: string; args: Record<string, string | number | boolean | null> }>;
      createdAt: string;
    };

const PENDING_DIR = resolve("state", "pending");
const PENDING_PATH = resolve(PENDING_DIR, "pending.json");

interface PendingState {
  [threadId: string]: PendingAction;
}

async function loadPending(): Promise<PendingState> {
  try {
    const data = await readFile(PENDING_PATH, "utf8");
    return JSON.parse(data) as PendingState;
  } catch {
    return {};
  }
}

async function savePending(state: PendingState): Promise<void> {
  await mkdir(PENDING_DIR, { recursive: true });
  await writeFile(PENDING_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function setPending(threadId: string, action: PendingAction): Promise<void> {
  const state = await loadPending();
  state[threadId] = action;
  await savePending(state);
}

export async function getPending(threadId: string): Promise<PendingAction | null> {
  const state = await loadPending();
  return state[threadId] ?? null;
}

export async function clearPending(threadId: string): Promise<void> {
  const state = await loadPending();
  if (state[threadId]) {
    delete state[threadId];
    await savePending(state);
  }
}
