import { runScript } from "../executor/executor";
import { Skill, SkillContext, SkillResult } from "./types";

export class ScriptSkill implements Skill {
  name = "ScriptSkill";

  canHandle(intent: string): boolean {
    return intent === "RUN_SCRIPT";
  }

  async execute(args: Record<string, unknown>, _ctx: SkillContext): Promise<SkillResult> {
    const script = typeof args.script === "string" ? args.script : "";
    if (!script) {
      return { ok: false, output: "Script não informado." };
    }
    const output = await runScript(script);
    return { ok: true, output: output || "Sem saída." };
  }
}
