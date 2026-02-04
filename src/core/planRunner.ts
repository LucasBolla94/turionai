import { findSkillByIntent, getSkillByName } from "../skills/registry";
import { SkillContext } from "../skills/types";
import { appendAudit } from "./auditLog";

export interface PlanStep {
  skill: string;
  args: Record<string, string | number | boolean | null>;
}

export async function runPlan(steps: PlanStep[], ctx: SkillContext): Promise<string[]> {
  const outputs: string[] = [];
  for (const step of steps) {
    const skill = getSkillByName(step.skill) ?? findSkillByIntent(step.skill);
    if (!skill) {
      outputs.push(`Skill não encontrada: ${step.skill}`);
      await appendAudit({
        ts: new Date().toISOString(),
        action: "RUN_PLAN",
        status: "error",
        details: { skill: step.skill, reason: "skill_not_found" },
      });
      continue;
    }
    try {
      const result = await skill.execute(step.args, ctx);
      outputs.push(`${skill.name}: ${result.output}`);
      await appendAudit({
        ts: new Date().toISOString(),
        action: "RUN_PLAN",
        status: result.ok ? "ok" : "error",
        details: { skill: step.skill, args: step.args },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao executar skill.";
      outputs.push(`${skill.name}: ${message}`);
      await appendAudit({
        ts: new Date().toISOString(),
        action: "RUN_PLAN",
        status: "error",
        details: { skill: step.skill, error: message },
      });
    }
  }
  return outputs;
}
