import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

export type MemoryType = "fact" | "decision" | "preference" | "task";

export interface MemoryItem {
  id: string;
  type: MemoryType;
  text: string;
  keywords: string[];
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryProject {
  id: string;
  type: "project";
  name: string;
  repo_url: string;
  path: string;
  deploy: "docker-compose";
  ports: number[];
  domains: string[];
  last_deploy_ts: string;
  keywords: string[];
  weight: number;
  created_at: string;
  updated_at: string;
}

interface MemoryFile {
  facts: MemoryItem[];
  decisions: MemoryItem[];
  projects: MemoryProject[];
  preferences: MemoryItem[];
  tasks: MemoryItem[];
  meta: { last_updated: string };
}

const MEMORY_DIR = resolve("state", "memory");
const MEMORY_PATH = resolve(MEMORY_DIR, "memory.json");
const INDEX_PATH = resolve(MEMORY_DIR, "keyword_index.json");

const EMPTY_MEMORY: MemoryFile = {
  facts: [],
  decisions: [],
  projects: [],
  preferences: [],
  tasks: [],
  meta: { last_updated: new Date().toISOString() },
};

function normalizeKeyword(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._+-]+/g, "").trim();
}

function extractKeywords(text: string): string[] {
  const raw = text.toLowerCase().split(/[^a-z0-9]+/g);
  const filtered = raw.filter((k) => k.length >= 3 && !/^\d+$/.test(k));
  return Array.from(new Set(filtered.map(normalizeKeyword).filter(Boolean)));
}

function mergeKeywords(existing: string[], incoming: string[]): string[] {
  const merged = new Set<string>();
  for (const keyword of existing) {
    const normalized = normalizeKeyword(keyword);
    if (normalized) merged.add(normalized);
  }
  for (const keyword of incoming) {
    const normalized = normalizeKeyword(keyword);
    if (normalized) merged.add(normalized);
  }
  return Array.from(merged);
}

async function loadMemory(): Promise<MemoryFile> {
  try {
    const data = await readFile(MEMORY_PATH, "utf8");
    return JSON.parse(data) as MemoryFile;
  } catch {
    return { ...EMPTY_MEMORY };
  }
}

async function saveMemory(memory: MemoryFile): Promise<void> {
  memory.meta.last_updated = new Date().toISOString();
  await mkdir(MEMORY_DIR, { recursive: true });
  await writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2), "utf8");
}

async function loadIndex(): Promise<Record<string, string[]>> {
  try {
    const data = await readFile(INDEX_PATH, "utf8");
    return JSON.parse(data) as Record<string, string[]>;
  } catch {
    return {};
  }
}

async function saveIndex(index: Record<string, string[]>): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

function addToIndex(
  index: Record<string, string[]>,
  keywords: string[],
  id: string,
): void {
  for (const keyword of keywords) {
    const key = normalizeKeyword(keyword);
    if (!key) continue;
    const list = index[key] ?? [];
    if (!list.includes(id)) {
      list.push(id);
    }
    index[key] = list;
  }
}

function buildIndex(memory: MemoryFile): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  const items: Array<MemoryItem | MemoryProject> = [
    ...memory.facts,
    ...memory.decisions,
    ...memory.preferences,
    ...memory.tasks,
    ...memory.projects,
  ];
  for (const item of items) {
    addToIndex(index, item.keywords ?? [], item.id);
  }
  return index;
}

function getList(memory: MemoryFile, type: MemoryType): MemoryItem[] {
  if (type === "fact") return memory.facts;
  if (type === "decision") return memory.decisions;
  if (type === "preference") return memory.preferences;
  return memory.tasks;
}

export async function addMemoryItem(
  type: MemoryType,
  text: string,
  keywords: string[] = [],
  weight = 0.6,
): Promise<MemoryItem> {
  const memory = await loadMemory();
  const index = await loadIndex();
  const list = getList(memory, type);
  const normalizedText = text.trim().toLowerCase();
  const existing = list.find((item) => item.text.toLowerCase() === normalizedText);

  if (existing) {
    existing.keywords = mergeKeywords(existing.keywords, [
      ...keywords,
      ...extractKeywords(text),
    ]);
    existing.weight = Math.max(existing.weight, weight);
    existing.updated_at = new Date().toISOString();
    addToIndex(index, existing.keywords, existing.id);
    await saveMemory(memory);
    await saveIndex(index);
    return existing;
  }

  const now = new Date().toISOString();
  const item: MemoryItem = {
    id: `${type}_${randomUUID()}`,
    type,
    text: text.trim(),
    keywords: mergeKeywords(keywords, extractKeywords(text)),
    weight,
    created_at: now,
    updated_at: now,
  };
  list.push(item);
  addToIndex(index, item.keywords, item.id);
  await saveMemory(memory);
  await saveIndex(index);
  return item;
}

export async function upsertProjectMemory(project: {
  name: string;
  repo_url: string;
  path: string;
  deploy: "docker-compose";
  ports: number[];
  domains: string[];
  last_deploy_ts: string;
}): Promise<void> {
  const memory = await loadMemory();
  const index = await loadIndex();
  const existing = memory.projects.find((item) => item.name === project.name);
  const baseKeywords = [
    project.name,
    project.repo_url,
    ...project.domains,
  ];
  const mergedKeywords = mergeKeywords(
    existing?.keywords ?? [],
    extractKeywords(baseKeywords.join(" ")),
  );
  const now = new Date().toISOString();

  if (existing) {
    existing.repo_url = project.repo_url;
    existing.path = project.path;
    existing.deploy = project.deploy;
    existing.ports = project.ports;
    existing.domains = project.domains;
    existing.last_deploy_ts = project.last_deploy_ts;
    existing.keywords = mergedKeywords;
    existing.weight = Math.max(existing.weight, 0.8);
    existing.updated_at = now;
    addToIndex(index, existing.keywords, existing.id);
  } else {
    const item: MemoryProject = {
      id: `project_${randomUUID()}`,
      type: "project",
      name: project.name,
      repo_url: project.repo_url,
      path: project.path,
      deploy: project.deploy,
      ports: project.ports,
      domains: project.domains,
      last_deploy_ts: project.last_deploy_ts,
      keywords: mergedKeywords,
      weight: 0.8,
      created_at: now,
      updated_at: now,
    };
    memory.projects.push(item);
    addToIndex(index, item.keywords, item.id);
  }

  await saveMemory(memory);
  await saveIndex(index);
}

export async function upsertProjectMemoryPartial(project: {
  name: string;
  repo_url?: string;
  path?: string;
  deploy?: "docker-compose";
  ports?: number[];
  domains?: string[];
  last_deploy_ts?: string;
  notes?: string;
  keywords?: string[];
  weight?: number;
}): Promise<void> {
  const memory = await loadMemory();
  const index = await loadIndex();
  const existing = memory.projects.find((item) => item.name === project.name);
  const now = new Date().toISOString();
  const mergedKeywords = mergeKeywords(
    existing?.keywords ?? [],
    mergeKeywords(project.keywords ?? [], extractKeywords(project.name)),
  );

  if (existing) {
    existing.repo_url = project.repo_url ?? existing.repo_url;
    existing.path = project.path ?? existing.path;
    existing.deploy = project.deploy ?? existing.deploy;
    existing.ports = project.ports ?? existing.ports;
    existing.domains = project.domains ?? existing.domains;
    existing.last_deploy_ts = project.last_deploy_ts ?? existing.last_deploy_ts;
    existing.keywords = mergedKeywords;
    existing.weight = Math.max(existing.weight, project.weight ?? existing.weight);
    existing.updated_at = now;
    addToIndex(index, existing.keywords, existing.id);
  } else {
    const item: MemoryProject = {
      id: `project_${randomUUID()}`,
      type: "project",
      name: project.name,
      repo_url: project.repo_url ?? "",
      path: project.path ?? "",
      deploy: project.deploy ?? "docker-compose",
      ports: project.ports ?? [],
      domains: project.domains ?? [],
      last_deploy_ts: project.last_deploy_ts ?? now,
      keywords: mergedKeywords,
      weight: project.weight ?? 0.8,
      created_at: now,
      updated_at: now,
    };
    memory.projects.push(item);
    addToIndex(index, item.keywords, item.id);
  }

  await saveMemory(memory);
  await saveIndex(index);
}

export async function updateProjectMemory(
  name: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const memory = await loadMemory();
  const project = memory.projects.find((item) => item.name === name);
  const now = new Date().toISOString();
  if (!project) {
    await upsertProjectMemoryPartial({ name });
    return;
  }

  const updated = { ...project, ...patch, updated_at: now } as MemoryProject;
  const index = memory.projects.findIndex((item) => item.id === project.id);
  memory.projects[index] = updated;
  updated.keywords = mergeKeywords(updated.keywords, extractKeywords(updated.name));
  await saveMemory(memory);
  await saveIndex(buildIndex(memory));
}

export async function removeMemoryByText(text: string): Promise<void> {
  const memory = await loadMemory();
  const target = text.trim().toLowerCase();
  const filterByText = (item: MemoryItem) => item.text.toLowerCase() !== target;
  memory.facts = memory.facts.filter(filterByText);
  memory.decisions = memory.decisions.filter(filterByText);
  memory.preferences = memory.preferences.filter(filterByText);
  memory.tasks = memory.tasks.filter(filterByText);
  await saveMemory(memory);
  await saveIndex(buildIndex(memory));
}

export async function searchMemoryByKeywords(
  keywords: string[],
  limit = 6,
): Promise<Array<MemoryItem | MemoryProject>> {
  const normalized = keywords.map(normalizeKeyword).filter(Boolean);
  if (normalized.length === 0) return [];
  const memory = await loadMemory();
  const index = await loadIndex();
  const idSet = new Set<string>();
  for (const keyword of normalized) {
    const ids = index[keyword] ?? [];
    for (const id of ids) {
      idSet.add(id);
    }
  }

  const allItems: Array<MemoryItem | MemoryProject> = [
    ...memory.facts,
    ...memory.decisions,
    ...memory.preferences,
    ...memory.tasks,
    ...memory.projects,
  ];
  const byId = new Map(allItems.map((item) => [item.id, item]));
  const results = Array.from(idSet)
    .map((id) => byId.get(id))
    .filter((item): item is MemoryItem | MemoryProject => Boolean(item));

  results.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.updated_at.localeCompare(a.updated_at);
  });

  return results.slice(0, limit);
}

export async function buildMemoryContext(text: string): Promise<string> {
  const keywords = extractKeywords(text);
  const results = await searchMemoryByKeywords(keywords, 6);
  if (results.length === 0) return "";

  const lines = results.map((item) => {
    if ("name" in item) {
      const domains = item.domains.length ? ` | domains: ${item.domains.join(",")}` : "";
      return `- [project] ${item.name} | ${item.repo_url}${domains}`;
    }
    return `- [${item.type}] ${item.text}`;
  });

  return `Memorias relevantes:\n${lines.join("\n")}`;
}
