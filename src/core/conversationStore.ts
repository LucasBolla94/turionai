import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ConversationEntry {
  ts: string;
  from: string;
  thread: string;
  direction: "in" | "out";
  text: string;
}

export interface DigestSummary {
  summary: string;
  current_goal: string;
  last_action: string;
  next_step: string;
}

const CONV_DIR = resolve("state", "conversations");
const DIGEST_DIR = resolve("state", "digests");

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function threadFile(threadId: string, date = new Date()): string {
  return resolve(CONV_DIR, dayKey(date), `thread_${threadId}.jsonl`);
}

export async function appendConversation(entry: ConversationEntry): Promise<void> {
  const dir = resolve(CONV_DIR, dayKey());
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify(entry);
  await appendFile(threadFile(entry.thread), `${line}\n`, "utf8");
}

export async function readRecentConversation(threadId: string, limit: number): Promise<string[]> {
  try {
    const content = await readFile(threadFile(threadId), "utf8");
    const lines = content.trim().split(/\r?\n/);
    return lines.slice(-limit);
  } catch {
    return [];
  }
}

export async function appendDigest(threadId: string, summary: DigestSummary): Promise<void> {
  const date = dayKey();
  const filePath = resolve(DIGEST_DIR, `${date}.json`);
  await mkdir(DIGEST_DIR, { recursive: true });
  let existing: Array<{ thread: string; summary: DigestSummary; ts: string }> = [];
  try {
    const current = await readFile(filePath, "utf8");
    existing = JSON.parse(current) as Array<{ thread: string; summary: DigestSummary; ts: string }>;
  } catch {
    existing = [];
  }
  existing.push({ thread: threadId, summary, ts: new Date().toISOString() });
  await writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");
}

export async function readLatestDigest(threadId: string): Promise<DigestSummary | null> {
  const filePath = resolve(DIGEST_DIR, `${dayKey()}.json`);
  try {
    const current = await readFile(filePath, "utf8");
    const entries = JSON.parse(current) as Array<{ thread: string; summary: DigestSummary }>;
    const filtered = entries.filter((entry) => entry.thread === threadId);
    if (filtered.length === 0) return null;
    return filtered[filtered.length - 1]?.summary ?? null;
  } catch {
    return null;
  }
}
