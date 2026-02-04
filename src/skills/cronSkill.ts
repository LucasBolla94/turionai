import { createCronNormalized, listCrons, pauseCron, removeCron } from "../core/cronManager";
import { Skill, SkillContext, SkillResult } from "./types";

export class CronSkill implements Skill {
  name = "CronSkill";

  canHandle(intent: string): boolean {
    return intent.startsWith("CRON_");
  }

  async execute(args: Record<string, unknown>, _ctx: SkillContext): Promise<SkillResult> {
    const action = typeof args.action === "string" ? args.action : "";

    if (action === "create") {
      try {
        const name = typeof args.name === "string" ? args.name : "";
        const schedule = typeof args.schedule === "string" ? args.schedule : "";
        const jobType = typeof args.jobType === "string" ? args.jobType : "";
        const payload = typeof args.payload === "string" ? args.payload : "";
        const timezone = typeof args.timezone === "string" ? args.timezone : undefined;
        const runOnce = typeof args.runOnce === "boolean" ? args.runOnce : undefined;
        if (!name || !schedule || !jobType) {
          return { ok: false, output: "Uso: cron add <name> <schedule> <jobType> [payload]" };
        }
        const job = await createCronNormalized({
          name,
          schedule,
          jobType,
          payload,
          timezone,
          runOnce,
        });
        const when = formatWhen(schedule);
        if (jobType === "reminder") {
          return {
            ok: true,
            output: `Deu tudo certo por aqui. Vou te lembrar em ${when}, fica tranquilo.`,
          };
        }
        return { ok: true, output: `Cron criado: ${job.name} (${job.schedule})` };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao criar cron.";
        const stack = error instanceof Error ? error.stack : "";
        return {
          ok: false,
          output: `Erro ao criar o lembrete: ${message}\nLog: ${stack || message}`,
        };
      }
    }

    if (action === "list") {
      const jobs = await listCrons();
      const output = jobs.length
        ? `Crons:\n${jobs
            .map(
              (j) => `- ${j.name} | ${j.schedule} | ${j.jobType} | ${j.enabled ? "ON" : "OFF"}`,
            )
            .join("\n")}`
        : "Nenhum cron configurado.";
      return { ok: true, output };
    }

    if (action === "pause") {
      const name = typeof args.name === "string" ? args.name : "";
      if (!name) return { ok: false, output: "Uso: cron pause <name>" };
      await pauseCron(name);
      return { ok: true, output: `Cron pausado: ${name}` };
    }

    if (action === "remove") {
      const name = typeof args.name === "string" ? args.name : "";
      if (!name) return { ok: false, output: "Uso: cron remove <name>" };
      await removeCron(name);
      return { ok: true, output: `Cron removido: ${name}` };
    }

    return { ok: false, output: "Acao de cron invalida." };
  }
}

function formatWhen(schedule: string): string {
  if (!schedule.includes("T")) {
    return "no horario combinado";
  }
  const target = new Date(schedule);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return "instantes";
  }
  const totalSeconds = Math.round(diffMs / 1000);
  if (totalSeconds < 60) return "instantes";
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minuto${totalMinutes === 1 ? "" : "s"}`;
  const totalHours = Math.round(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours} hora${totalHours === 1 ? "" : "s"}`;
  const totalDays = Math.round(totalHours / 24);
  return `${totalDays} dia${totalDays === 1 ? "" : "s"}`;
}
