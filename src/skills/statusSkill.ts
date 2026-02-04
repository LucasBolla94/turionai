import os from "node:os";
import { Skill, SkillContext, SkillResult } from "./types";

export class StatusSkill implements Skill {
  name = "StatusSkill";

  canHandle(intent: string): boolean {
    return intent === "STATUS";
  }

  async execute(_args: Record<string, unknown>, _ctx: SkillContext): Promise<SkillResult> {
    const uptimeSec = Math.floor(process.uptime());
    const memory = process.memoryUsage();
    const output = [
      "Status",
      `- uptime: ${uptimeSec}s`,
      `- platform: ${process.platform} ${process.arch}`,
      `- hostname: ${os.hostname()}`,
      `- rss: ${Math.round(memory.rss / 1024 / 1024)} MB`,
    ].join("\n");
    return { ok: true, output };
  }
}
