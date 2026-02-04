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
      return { ok: true, output: `Cron criado: ${job.name} (${job.schedule})` };
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

    return { ok: false, output: "Ação de cron inválida." };
  }
}
