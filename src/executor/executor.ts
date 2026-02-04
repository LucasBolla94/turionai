import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

const execFileAsync = promisify(execFile);

const DEFAULT_SCRIPTS_DIR = resolve("scripts");

const SUPPORTED_EXTENSIONS = new Set([".sh", ".ps1"]);

function getScriptsDir(): string {
  return process.env.TURION_SCRIPTS_DIR
    ? resolve(process.env.TURION_SCRIPTS_DIR)
    : DEFAULT_SCRIPTS_DIR;
}

function getRunnerForExtension(ext: string): string[] {
  if (ext === ".sh") {
    return process.platform === "win32" ? ["bash"] : ["sh"];
  }
  if (ext === ".ps1") {
    return process.platform === "win32"
      ? ["powershell", "-NoProfile", "-File"]
      : ["pwsh", "-File"];
  }
  throw new Error(`Extensao no suportada: ${ext}`);
}

export async function listScripts(): Promise<string[]> {
  const dir = getScriptsDir();
  const entries = await readdir(dir);
  const scripts: string[] = [];

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) continue;
    const ext = extname(entry).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;
    scripts.push(entry);
  }

  return scripts.sort();
}

export async function runScript(
  scriptName: string,
  args: string[] = [],
): Promise<string> {
  const dir = getScriptsDir();
  let safeName = basename(scriptName);
  let scriptPath = resolve(dir, safeName);
  let ext = extname(scriptPath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    const candidates = [".sh", ".ps1"].map((suffix) => `${safeName}${suffix}`);
    for (const candidate of candidates) {
      const candidatePath = resolve(dir, candidate);
      const candidateExt = extname(candidatePath).toLowerCase();
      try {
        const fileStat = await stat(candidatePath);
        if (fileStat.isFile() && SUPPORTED_EXTENSIONS.has(candidateExt)) {
          safeName = candidate;
          scriptPath = candidatePath;
          ext = candidateExt;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error("Script no permitido.");
  }

  const runner = getRunnerForExtension(ext);
  try {
    const { stdout, stderr } = await execFileAsync(
      runner[0],
      [...runner.slice(1), scriptPath, ...args],
      {
        timeout: 30_000,
      },
    );
    return [stdout, stderr].filter(Boolean).join("\n");
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const details = [err.message, err.stdout, err.stderr].filter(Boolean).join("\n");
    throw new Error(details || "Falha ao executar script.");
  }
}