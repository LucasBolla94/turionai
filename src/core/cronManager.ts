import cron, { ScheduledTask } from "node-cron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface CronJob {
  name: string;
  schedule: string;
  jobType: string;
  payload: string;
  enabled: boolean;
  createdAt: string;
}

const CRON_DIR = resolve("state", "crons");
const CRON_STATE_PATH = resolve(CRON_DIR, "crons.json");

const tasks = new Map<string, ScheduledTask>();

async function ensureStateDir(): Promise<void> {
  await mkdir(CRON_DIR, { recursive: true });
}

async function loadState(): Promise<CronJob[]> {
  try {
    const data = await readFile(CRON_STATE_PATH, "utf8");
    return JSON.parse(data) as CronJob[];
  } catch {
    return [];
  }
}

async function saveState(jobs: CronJob[]): Promise<void> {
  await ensureStateDir();
  await writeFile(CRON_STATE_PATH, JSON.stringify(jobs, null, 2), "utf8");
}

function buildTask(job: CronJob): ScheduledTask {
  return cron.schedule(job.schedule, () => {
    console.log(`[Turion][Cron] ${job.name} -> ${job.jobType}`, job.payload);
  });
}

export async function initCronManager(): Promise<void> {
  const jobs = await loadState();
  for (const job of jobs) {
    if (!job.enabled) continue;
    const task = buildTask(job);
    tasks.set(job.name, task);
    task.start();
  }
}

export async function listCrons(): Promise<CronJob[]> {
  return loadState();
}

export async function createCron(
  name: string,
  schedule: string,
  jobType: string,
  payload: string,
): Promise<CronJob> {
  if (!cron.validate(schedule)) {
    throw new Error("Schedule inválido.");
  }
  const jobs = await loadState();
  if (jobs.find((j) => j.name === name)) {
    throw new Error("Cron com este nome já existe.");
  }
  const job: CronJob = {
    name,
    schedule,
    jobType,
    payload,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  await saveState(jobs);

  const task = buildTask(job);
  tasks.set(job.name, task);
  task.start();

  return job;
}

export async function pauseCron(name: string): Promise<void> {
  const jobs = await loadState();
  const job = jobs.find((j) => j.name === name);
  if (!job) throw new Error("Cron não encontrado.");
  job.enabled = false;
  await saveState(jobs);

  const task = tasks.get(name);
  if (task) {
    task.stop();
    tasks.delete(name);
  }
}

export async function removeCron(name: string): Promise<void> {
  const jobs = await loadState();
  const next = jobs.filter((j) => j.name !== name);
  if (next.length === jobs.length) {
    throw new Error("Cron não encontrado.");
  }
  await saveState(next);

  const task = tasks.get(name);
  if (task) {
    task.stop();
    tasks.delete(name);
  }
}
