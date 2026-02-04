import { runScript } from "../executor/executor";
import { getProject, upsertProject } from "../core/projectRegistry";
import { Skill, SkillContext, SkillResult } from "./types";

export class DeploySkill implements Skill {
  name = "DeploySkill";

  canHandle(intent: string): boolean {
    return intent === "DEPLOY" || intent === "REDEPLOY";
  }

  async execute(args: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
    const project = typeof args.project === "string" ? args.project : "";
    const repoUrl = typeof args.repo_url === "string" ? args.repo_url : "";
    const mode = typeof args.mode === "string" ? args.mode : "deploy";

    const deployScript =
      ctx.platform === "win32" ? "deploy_compose.ps1" : "deploy_compose.sh";

    if (mode === "redeploy") {
      if (!project) return { ok: false, output: "Projeto não informado." };
      const entry = await getProject(project);
      if (!entry) return { ok: false, output: "Projeto não encontrado." };
      const output = await runScript(deployScript, [entry.name, entry.repo_url]);
      await upsertProject({
        ...entry,
        last_deploy_ts: new Date().toISOString(),
      });
      return { ok: true, output: output || "Redeploy concluído." };
    }

    if (!project || !repoUrl) {
      return { ok: false, output: "Uso: deploy <name> <repo_url>" };
    }
    const output = await runScript(deployScript, [project, repoUrl]);
    await upsertProject({
      name: project,
      repo_url: repoUrl,
      path:
        ctx.platform === "win32"
          ? `C:\\opt\\turion\\projects\\${project}`
          : `/opt/turion/projects/${project}`,
      deploy: "docker-compose",
      ports: [],
      domains: [],
      last_deploy_ts: new Date().toISOString(),
    });
    return { ok: true, output: output || "Deploy concluído." };
  }
}
