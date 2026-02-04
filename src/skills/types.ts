export interface SkillContext {
  platform: NodeJS.Platform;
}

export interface SkillResult {
  ok: boolean;
  output: string;
}

export interface Skill {
  name: string;
  canHandle(intent: string): boolean;
  execute(args: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult>;
}
