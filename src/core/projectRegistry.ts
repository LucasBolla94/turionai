import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface ProjectEntry {
  name: string;
  repo_url: string;
  path: string;
  deploy: "docker-compose";
  ports: number[];
  domains: string[];
  last_deploy_ts: string;
}

interface RegistryFile {
  projects: ProjectEntry[];
}

const MEMORY_DIR = resolve("state", "memory");
const REGISTRY_PATH = resolve(MEMORY_DIR, "projects.json");

async function ensureDir(): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true });
}

async function loadRegistry(): Promise<RegistryFile> {
  try {
    const data = await readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(data) as RegistryFile;
  } catch {
    return { projects: [] };
  }
}

async function saveRegistry(registry: RegistryFile): Promise<void> {
  await ensureDir();
  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

export async function getProject(name: string): Promise<ProjectEntry | null> {
  const registry = await loadRegistry();
  return registry.projects.find((p) => p.name === name) ?? null;
}

export async function upsertProject(entry: ProjectEntry): Promise<void> {
  const registry = await loadRegistry();
  const index = registry.projects.findIndex((p) => p.name === entry.name);
  if (index >= 0) {
    registry.projects[index] = entry;
  } else {
    registry.projects.push(entry);
  }
  await saveRegistry(registry);
}
