import { Skill } from "./types";
import { StatusSkill } from "./statusSkill";
import { ScriptSkill } from "./scriptSkill";
import { DeploySkill } from "./deploySkill";
import { LogsSkill } from "./logsSkill";
import { CronSkill } from "./cronSkill";
import { EmailSkill } from "./emailSkill";

const skills: Skill[] = [
  new StatusSkill(),
  new ScriptSkill(),
  new DeploySkill(),
  new LogsSkill(),
  new CronSkill(),
  new EmailSkill(),
];

export function getSkills(): Skill[] {
  return skills;
}

export function getSkillByName(name: string): Skill | undefined {
  return skills.find((s) => s.name === name);
}

export function findSkillByIntent(intent: string): Skill | undefined {
  return skills.find((s) => s.canHandle(intent));
}
