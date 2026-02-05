import { createBucket, listBuckets, runMigration } from "../core/supabaseGovernance";
import { Skill, SkillContext, SkillResult } from "./types";

export class SupabaseSkill implements Skill {
  name = "SupabaseSkill";

  canHandle(intent: string): boolean {
    return (
      intent === "SUPABASE_SQL" ||
      intent === "SUPABASE_BUCKET_CREATE" ||
      intent === "SUPABASE_BUCKET_LIST"
    );
  }

  async execute(args: Record<string, unknown>, _ctx: SkillContext): Promise<SkillResult> {
    if (args.action === "bucket_list" || args.intent === "SUPABASE_BUCKET_LIST") {
      const result = await listBuckets();
      if (!result.ok) return { ok: false, output: `Erro: ${result.message}` };
      const buckets = result.buckets.length ? result.buckets.join(", ") : "nenhum";
      return { ok: true, output: `Buckets: ${buckets}` };
    }

    if (args.action === "bucket_create" || args.intent === "SUPABASE_BUCKET_CREATE") {
      const name = typeof args.name === "string" ? args.name : "";
      const isPublic = typeof args.public === "boolean" ? args.public : false;
      if (!name) return { ok: false, output: "Informe o nome do bucket." };
      const result = await createBucket(name, isPublic);
      if (!result.ok) return { ok: false, output: `Erro: ${result.message}` };
      return { ok: true, output: result.message };
    }

    const sql = typeof args.sql === "string" ? args.sql : "";
    const allowDestructive = Boolean(args.allowDestructive);
    if (!sql) return { ok: false, output: "SQL vazio. Informe o comando SQL." };
    const result = await runMigration(sql, allowDestructive);
    if (!result.ok) return { ok: false, output: `Erro: ${result.message}` };
    return { ok: true, output: result.message };
  }
}
