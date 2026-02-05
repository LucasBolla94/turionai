import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isIdleNow } from "./idleDetector";
import { generateSilentStudy } from "./brain";

interface StudyLimits {
  day: string;
  used_words: number;
  last_run?: string;
}

const STUDY_DIR = resolve("state", "learning");
const LIMITS_PATH = resolve(STUDY_DIR, "limits.json");
const DAILY_WORD_LIMIT = 1200;

const TOPICS = [
  "otimizacao de latencia em sistemas de agentes",
  "estrategias seguras de compressao de contexto",
  "boas praticas de governanca de dados",
  "desenho de memoria longa eficiente",
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadLimits(): Promise<StudyLimits> {
  try {
    const data = await readFile(LIMITS_PATH, "utf8");
    return JSON.parse(data) as StudyLimits;
  } catch {
    return { day: todayKey(), used_words: 0 };
  }
}

async function saveLimits(limits: StudyLimits): Promise<void> {
  await mkdir(STUDY_DIR, { recursive: true });
  await writeFile(LIMITS_PATH, JSON.stringify(limits, null, 2), "utf8");
}

function pickTopic(seed: number): string {
  return TOPICS[seed % TOPICS.length] ?? TOPICS[0];
}

export async function runSilentStudy(): Promise<{ ok: boolean; message: string }> {
  const idle = await isIdleNow();
  if (!idle.ok) {
    return { ok: false, message: idle.reason ?? "Nao ocioso" };
  }

  const limits = await loadLimits();
  const today = todayKey();
  if (limits.day !== today) {
    limits.day = today;
    limits.used_words = 0;
  }
  if (limits.used_words >= DAILY_WORD_LIMIT) {
    return { ok: false, message: "Limite diario atingido" };
  }

  if (!process.env.XAI_API_KEY) {
    return { ok: false, message: "XAI_API_KEY ausente" };
  }

  const seed = Math.floor(Math.random() * 10_000);
  const topic = pickTopic(seed);
  const response = await generateSilentStudy({ topic, seed });

  if (!response) {
    return { ok: false, message: "IA sem resposta" };
  }

  const stillIdle = await isIdleNow();
  if (!stillIdle.ok) {
    return { ok: false, message: "Interrompido por atividade do usuario" };
  }

  const words = response.split(/\s+/).filter(Boolean).length;
  limits.used_words += words;
  limits.last_run = new Date().toISOString();
  await saveLimits(limits);

  const dayDir = resolve(STUDY_DIR, today);
  await mkdir(dayDir, { recursive: true });
  const logPath = resolve(dayDir, "study.jsonl");
  const entry = {
    ts: new Date().toISOString(),
    topic,
    words,
    summary: response,
  };
  await appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");

  return { ok: true, message: "Estudo registrado" };
}
