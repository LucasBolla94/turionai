import cron, { ScheduledTask } from "node-cron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { runMemoryOrganizer } from "./memoryOrganizer";

export interface CronJob {
  name: string;
  schedule: string;
  jobType: string;
  payload: string;
  enabled: boolean;
  createdAt: string;
  timezone?: string;
  runOnce?: boolean;
  lastRun?: string;
}

const CRON_DIR = resolve("state", "crons");
const CRON_STATE_PATH = resolve(CRON_DIR, "crons.json");

const tasks = new Map<string, ScheduledTask>();
const handlers = new Map<string, (job: CronJob) => Promise<void>>();

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

async function markJobRun(jobName: string): Promise<void> {
  const jobs = await loadState();
  const job = jobs.find((j) => j.name === jobName);
  if (!job) return;
  job.lastRun = new Date().toISOString();
  if (job.runOnce) {
    job.enabled = false;
  }
  await saveState(jobs);
}

function buildTask(job: CronJob): ScheduledTask {
  return cron.schedule(
    job.schedule,
    () => {
      if (job.runOnce && job.lastRun) {
        return;
      }
      if (job.jobType === "memory_organizer_daily") {
        console.log(`[Turion][Cron] ${job.name} -> ${job.jobType}`);
        runMemoryOrganizer()
          .then(() => markJobRun(job.name))
          .catch((error) => {
            console.error("[Turion][Cron] Memory organizer falhou:", error);
          });
        return;
      }
      const handler = handlers.get(job.jobType);
      if (!handler) {
        console.log(`[Turion][Cron] ${job.name} -> ${job.jobType}`, job.payload);
        return;
      }
      handler(job)
        .then(() => markJobRun(job.name))
        .catch((error) => {
          console.error(`[Turion][Cron] ${job.name} falhou:`, error);
        });
    },
    job.timezone ? { timezone: job.timezone } : undefined,
  );
}

export async function initCronManager(): Promise<void> {
  const jobs = await loadState();
  if (!jobs.find((job) => job.name === "memory_organizer_daily")) {
    const job: CronJob = {
      name: "memory_organizer_daily",
      schedule: "30 3 * * *",
      jobType: "memory_organizer_daily",
      payload: "",
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    jobs.push(job);
    await saveState(jobs);
  }
  if (!jobs.find((job) => job.name === "interaction_checkin_default")) {
    const job: CronJob = {
      name: "interaction_checkin_default",
      schedule: "30 9,14,19 * * *",
      jobType: "interaction_checkin",
      payload: "",
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    jobs.push(job);
    await saveState(jobs);
  }
  if (!jobs.find((job) => job.name === "update_check_10m")) {
    const job: CronJob = {
      name: "update_check_10m",
      schedule: "*/10 * * * *",
      jobType: "update_check",
      payload: "",
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    jobs.push(job);
    await saveState(jobs);
  }
  for (const job of jobs) {
    if (!job.enabled) continue;
    const task = buildTask(job);
    tasks.set(job.name, task);
    task.start();
  }
}

export function registerCronHandler(
  jobType: string,
  handler: (job: CronJob) => Promise<void>,
): void {
  handlers.set(jobType, handler);
}

export async function listCrons(): Promise<CronJob[]> {
  return loadState();
}

export async function createCron(
  name: string,
  schedule: string,
  jobType: string,
  payload: string,
  options: { timezone?: string; runOnce?: boolean } = {},
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
    timezone: options.timezone,
    runOnce: options.runOnce,
  };
  jobs.push(job);
  await saveState(jobs);

  const task = buildTask(job);
  tasks.set(job.name, task);
  task.start();

  return job;
}

function isIsoDate(value: string): boolean {
  if (!value.includes("T")) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function cronFromDate(date: Date, timeZone?: string): string {
  if (!timeZone) {
    return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${
      date.getMonth() + 1
    } *`;
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const month = Number(lookup("month"));
  const day = Number(lookup("day"));
  const hour = Number(lookup("hour"));
  const minute = Number(lookup("minute"));
  return `${minute} ${hour} ${day} ${month} *`;
}

export async function createCronNormalized(params: {
  name: string;
  schedule: string;
  jobType: string;
  payload: string;
  timezone?: string;
  runOnce?: boolean;
}): Promise<CronJob> {
  const { name, schedule, jobType, payload, timezone, runOnce } = params;
  if (isIsoDate(schedule)) {
    const date = new Date(schedule);
    const now = new Date();
    if (date.getTime() <= now.getTime()) {
      throw new Error("Schedule no passado.");
    }
    const cronExpr = cronFromDate(date, timezone);
    return createCron(name, cronExpr, jobType, payload, {
      timezone,
      runOnce: true,
    });
  }
  return createCron(name, schedule, jobType, payload, { timezone, runOnce });
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
