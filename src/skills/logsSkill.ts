import { runScript } from "../executor/executor";
import { Skill, SkillContext, SkillResult } from "./types";

function truncateLogs(input: string): string {
  const maxChars = 20_000;
  const lines = input.split(/\r?\n/);
  const deduped: string[] = [];
  let last = "";
  for (const line of lines) {
    if (line === last) continue;
    deduped.push(line);
    last = line;
  }
  const joined = deduped.join("\n");
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars)}\n...[truncado]`;
}

export class LogsSkill implements Skill {
  name = "LogsSkill";

  canHandle(intent: string): boolean {
    return intent === "LOGS";
  }

  async execute(args: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
    const project = typeof args.project === "string" ? args.project : "";
    const lines = typeof args.lines === "number" ? String(args.lines) : "200";
    if (!project) return { ok: false, output: "Projeto não informado." };
    const logsScript = ctx.platform === "win32" ? "logs_compose.ps1" : "logs_compose.sh";
    const output = await runScript(logsScript, [project, lines]);
    return { ok: true, output: truncateLogs(output) };
  }
}
