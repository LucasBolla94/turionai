import { mkdir, appendFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface AuditEntry {
  ts: string;
  action: string;
  status: "ok" | "error";
  details?: Record<string, unknown>;
}

function getAuditPath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return resolve("state", "audit", `${date}.jsonl`);
}

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const filePath = getAuditPath();
  const dir = resolve("state", "audit");
  await mkdir(dir, { recursive: true });
  const line = JSON.stringify(entry);
  await appendFile(filePath, `${line}\n`, "utf8");
}
