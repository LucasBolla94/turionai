import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface EmailSnapshotItem {
  id: number;
  sender: string;
  subject: string;
  category: "important" | "normal" | "promo" | "newsletter" | "spam";
}

interface SnapshotFile {
  ts: string;
  items: EmailSnapshotItem[];
}

const SNAP_DIR = resolve("state", "memory");
const SNAP_PATH = resolve(SNAP_DIR, "email_last.json");

export async function saveEmailSnapshot(items: EmailSnapshotItem[]): Promise<void> {
  await mkdir(SNAP_DIR, { recursive: true });
  const payload: SnapshotFile = { ts: new Date().toISOString(), items };
  await writeFile(SNAP_PATH, JSON.stringify(payload, null, 2), "utf8");
}

export async function loadEmailSnapshot(): Promise<SnapshotFile | null> {
  try {
    const data = await readFile(SNAP_PATH, "utf8");
    return JSON.parse(data) as SnapshotFile;
  } catch {
    return null;
  }
}
