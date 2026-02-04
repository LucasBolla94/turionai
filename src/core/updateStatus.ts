import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

interface UpdateState {
  to: string;
  ts: string;
}

const UPDATE_DIR = resolve("state", "memory");
const UPDATE_PATH = resolve(UPDATE_DIR, "update_pending.json");

export async function markUpdatePending(to: string): Promise<void> {
  await mkdir(UPDATE_DIR, { recursive: true });
  const payload: UpdateState = { to, ts: new Date().toISOString() };
  await writeFile(UPDATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export async function consumeUpdatePending(): Promise<UpdateState | null> {
  try {
    const data = await readFile(UPDATE_PATH, "utf8");
    const parsed = JSON.parse(data) as UpdateState;
    await unlink(UPDATE_PATH);
    return parsed;
  } catch {
    return null;
  }
}

export async function hasUpdatePending(): Promise<boolean> {
  try {
    await readFile(UPDATE_PATH, "utf8");
    return true;
  } catch {
    return false;
  }
}
