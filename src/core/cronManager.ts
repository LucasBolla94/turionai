import cron, { ScheduledTask } from "node-cron";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  enabled: boolean;
  createdAt: string;
}

const CRON_STATE_PATH = resolve("state", "cron.json");

const tasks = new Map<string, ScheduledTask>();

async function loadState(): Promise<CronJob[]> {
  try {
    const data = await readFile(CRON_STATE_PATH, "utf8");
    return JSON.parse(data) as CronJob[];
  } catch {
    return [];
  }
}

async function saveState(jobs: CronJob[]): Promise<void> {
  await writeFile(CRON_STATE_PATH, JSON.stringify(jobs, null, 2), "utf8");
}

function buildTask(job: CronJob): ScheduledTask {
  return cron.schedule(job.schedule, () => {
    console.log(`[Turion][Cron] ${job.id} -> ${job.command}`);
  });
}

export async function initCronManager(): Promise<void> {
  const jobs = await loadState();
  for (const job of jobs) {
    if (!job.enabled) continue;
    const task = buildTask(job);
    tasks.set(job.id, task);
    task.start();
  }
}

export async function listCronJobs(): Promise<CronJob[]> {
  return loadState();
}

export async function addCronJob(
  schedule: string,
  command: string,
): Promise<CronJob> {
  if (!cron.validate(schedule)) {
    throw new Error("Schedule inválido.");
  }
  const jobs = await loadState();
  const id = `cron_${Date.now()}`;
  const job: CronJob = {
    id,
    schedule,
    command,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  await saveState(jobs);

  const task = buildTask(job);
  tasks.set(job.id, task);
  task.start();

  return job;
}

export async function pauseCronJob(id: string): Promise<void> {
  const jobs = await loadState();
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error("Cron não encontrado.");
  job.enabled = false;
  await saveState(jobs);

  const task = tasks.get(id);
  if (task) {
    task.stop();
    tasks.delete(id);
  }
}

export async function removeCronJob(id: string): Promise<void> {
  const jobs = await loadState();
  const next = jobs.filter((j) => j.id !== id);
  if (next.length === jobs.length) {
    throw new Error("Cron não encontrado.");
  }
  await saveState(next);

  const task = tasks.get(id);
  if (task) {
    task.stop();
    tasks.delete(id);
  }
}
