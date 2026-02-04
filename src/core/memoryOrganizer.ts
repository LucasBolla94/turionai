import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { organizeMemory } from "./brain";
import { addMemoryItem, removeMemoryByText, updateProjectMemory, upsertProjectMemoryPartial } from "./memoryStore";
import { appendDigest } from "./conversationStore";

interface ConversationLine {
  ts: string;
  from: string;
  direction: "in" | "out";
  text: string;
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function loadDayConversations(date = new Date()): Promise<ConversationLine[]> {
  const dir = resolve("state", "conversations", dayKey(date));
  try {
    const files = await readdir(dir);
    const lines: ConversationLine[] = [];
    for (const file of files) {
      const content = await readFile(resolve(dir, file), "utf8");
      const entries = content
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as ConversationLine);
      lines.push(...entries);
    }
    return lines.sort((a, b) => a.ts.localeCompare(b.ts));
  } catch {
    return [];
  }
}

function compactConversations(lines: ConversationLine[], limit = 200): string {
  const slice = lines.slice(-limit);
  return slice
    .map((entry) => `[${entry.ts}] (${entry.direction}) ${entry.from}: ${entry.text}`)
    .join("\n");
}

export async function runMemoryOrganizer(): Promise<void> {
  const lines = await loadDayConversations();
  if (lines.length === 0) {
    console.log("[Turion][Memory] Nenhuma conversa para organizar.");
    return;
  }

  const compacted = compactConversations(lines, 200);
  const result = await organizeMemory(compacted);
  if (!result) {
    console.warn("[Turion][Memory] Organizer sem resposta válida.");
    return;
  }

  for (const fact of result.new_memories.user_facts ?? []) {
    await addMemoryItem("user_fact", fact.text, fact.keywords ?? [], fact.weight ?? 0.6);
  }
  for (const fact of result.new_memories.project_facts ?? []) {
    await addMemoryItem("project_fact", fact.text, fact.keywords ?? [], fact.weight ?? 0.7);
  }
  for (const decision of result.new_memories.decisions ?? []) {
    await addMemoryItem("decision", decision.text, decision.keywords ?? [], decision.weight ?? 0.8);
  }
  for (const task of result.new_memories.running_tasks ?? []) {
    await addMemoryItem("running_task", task.text, task.keywords ?? [], task.weight ?? 0.6);
  }
  for (const project of result.new_memories.projects ?? []) {
    await upsertProjectMemoryPartial({
      name: project.name,
      repo_url: project.repo_url,
      domains: project.domains ?? [],
      keywords: project.keywords ?? [],
      weight: project.weight ?? 0.8,
      notes: project.notes,
    });
  }

  for (const dedupe of result.dedupe ?? []) {
    await removeMemoryByText(dedupe.drop_text);
  }

  for (const update of result.updates ?? []) {
    if (update.type === "project") {
      await updateProjectMemory(update.match, update.patch ?? {});
    }
  }

  if (result.digest) {
    await appendDigest("daily", result.digest);
  }

  console.log("[Turion][Memory] Organizer aplicado.");
}
