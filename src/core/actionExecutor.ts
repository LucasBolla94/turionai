import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runScript } from "../executor/executor";

export type ActionType = "create_dir" | "write_file" | "read_file" | "run_script";

export interface Action {
  type: ActionType;
  path?: string;
  content?: string;
  script?: string;
  max_bytes?: number;
}

const WORKSPACE_ROOT = resolve(process.cwd());

function isAllowedReadPath(targetPath: string): boolean {
  const normalized = targetPath.replace(/\\/g, "/");
  return normalized.includes("/logs/") || normalized.includes("/state/");
}

function ensureSafePath(targetPath: string): string {
  const resolved = resolve(targetPath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error("Caminho fora do workspace.");
  }
  return resolved;
}

export async function executeActions(actions: Action[]): Promise<string[]> {
  const results: string[] = [];
  for (const action of actions) {
    if (action.type === "create_dir") {
      if (!action.path) throw new Error("create_dir requer path.");
      const dirPath = ensureSafePath(action.path);
      await mkdir(dirPath, { recursive: true });
      results.push(`create_dir ok: ${action.path}`);
      continue;
    }

    if (action.type === "read_file") {
      if (!action.path) throw new Error("read_file requer path.");
      const filePath = ensureSafePath(action.path);
      if (!isAllowedReadPath(filePath)) {
        throw new Error("read_file permitido apenas em logs/ ou state/.");
      }
      const maxBytes = typeof action.max_bytes === "number" ? action.max_bytes : 20_000;
      const content = await (await import("node:fs/promises")).readFile(filePath, "utf8");
      const output = content.length > maxBytes ? `${content.slice(0, maxBytes)}\n...[truncado]` : content;
      results.push(`read_file ok: ${action.path}\n${output}`);
      continue;
    }

    if (action.type === "write_file") {
      if (!action.path) throw new Error("write_file requer path.");
      const filePath = ensureSafePath(action.path);
      const content = action.content ?? "";
      await writeFile(filePath, content, "utf8");
      results.push(`write_file ok: ${action.path}`);
      continue;
    }

    if (action.type === "run_script") {
      if (!action.script) throw new Error("run_script requer script.");
      const output = await runScript(action.script);
      results.push(`run_script ok: ${action.script}\n${output}`);
      continue;
    }

    throw new Error(`Ação não suportada: ${action.type}`);
  }

  return results;
}
