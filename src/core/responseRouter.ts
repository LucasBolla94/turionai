import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BrainResult } from "./brain";
import { getPreferences } from "./preferences";

export type ProviderChoice = "anthropic" | "grok";

export interface RouterDecision {
  provider: ProviderChoice;
  score: number;
  reasons: string[];
}

interface RouterState {
  total: number;
  anthropic: number;
  grok: number;
  bias: number;
  last_provider?: ProviderChoice;
  last_score?: number;
  last_reason?: string;
  updated_at?: string;
}

const ROUTER_DIR = resolve("state", "router");
const ROUTER_PATH = resolve(ROUTER_DIR, "router_state.json");

const DEFAULT_STATE: RouterState = {
  total: 0,
  anthropic: 0,
  grok: 0,
  bias: 0,
};

async function loadState(): Promise<RouterState> {
  try {
    const data = await readFile(ROUTER_PATH, "utf8");
    return { ...DEFAULT_STATE, ...(JSON.parse(data) as RouterState) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveState(state: RouterState): Promise<void> {
  await mkdir(ROUTER_DIR, { recursive: true });
  await writeFile(ROUTER_PATH, JSON.stringify(state, null, 2), "utf8");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreMessage(input: string, result: BrainResult, prefs: Awaited<ReturnType<typeof getPreferences>>): { score: number; reasons: string[] } {
  const normalized = input.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  const length = input.trim().length;
  if (length > 350) {
    score += 2;
    reasons.push("texto longo");
  } else if (length > 180) {
    score += 1;
    reasons.push("texto medio");
  }

  const complexKeywords = [
    "erro",
    "bug",
    "stack",
    "trace",
    "deploy",
    "docker",
    "compose",
    "sql",
    "schema",
    "supabase",
    "cron",
    "pipeline",
    "api",
    "auth",
    "oauth",
    "config",
    "infra",
    "diagnostico",
    "logs",
    "performance",
    "seguranca",
  ];
  if (complexKeywords.some((k) => normalized.includes(k))) {
    score += 2;
    reasons.push("topico tecnico");
  }

  const multiStep = /(passo a passo|etapas|primeiro|depois|em seguida|e depois)/.test(normalized);
  if (multiStep) {
    score += 1;
    reasons.push("multi-etapas");
  }

  if (result.action === "RUN_PLAN") {
    score += 2;
    reasons.push("plano multiplo");
  }

  if (result.action === "RUN_SKILL" && result.risk && result.risk !== "low") {
    score += 1;
    reasons.push("risco maior");
  }

  if (result.missing && result.missing.length > 0) {
    score += 1;
    reasons.push("faltando dados");
  }

  if (prefs.avg_message_length === "long") {
    score += 1;
    reasons.push("prefere detalhado");
  }

  if (prefs.avg_message_length === "short" && score > 0) {
    score -= 1;
    reasons.push("prefere curto");
  }

  return { score, reasons };
}

export async function chooseProvider(input: string, result: BrainResult): Promise<RouterDecision> {
  const prefs = await getPreferences();
  const state = await loadState();
  const scored = scoreMessage(input, result, prefs);
  const score = scored.score + (state.bias ?? 0);
  const provider: ProviderChoice = score >= 3 ? "anthropic" : "grok";

  state.total += 1;
  if (provider === "anthropic") state.anthropic += 1;
  if (provider === "grok") state.grok += 1;
  state.last_provider = provider;
  state.last_score = score;
  state.last_reason = scored.reasons.join(", ");
  state.updated_at = new Date().toISOString();
  await saveState(state);

  return { provider, score, reasons: scored.reasons };
}

export async function updateRouterFromMessage(text: string): Promise<void> {
  const normalized = text.toLowerCase();
  if (!normalized) return;
  const state = await loadState();

  const wantsAnthropic = normalized.includes("usa anthropic") || normalized.includes("resposta mais completa") || normalized.includes("detalha");
  const wantsGrok = normalized.includes("usa grok") || normalized.includes("responde curto") || normalized.includes("sem detalhes");

  if (wantsAnthropic) {
    state.bias = clamp((state.bias ?? 0) + 1, -3, 3);
  } else if (wantsGrok) {
    state.bias = clamp((state.bias ?? 0) - 1, -3, 3);
  }

  state.updated_at = new Date().toISOString();
  await saveState(state);
}
