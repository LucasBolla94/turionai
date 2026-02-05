import { Client } from "pg";

function getRefFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseDbConfig(): { connString: string } {
  const url = process.env.SUPABASE_URL ?? "";
  const password = process.env.SUPABASE_DB_PASSWORD ?? "";
  if (!url || !password) {
    throw new Error("SUPABASE_URL e SUPABASE_DB_PASSWORD precisam estar configurados.");
  }
  const ref = getRefFromUrl(url);
  if (!ref) {
    throw new Error("SUPABASE_URL invalida.");
  }
  const host = `db.${ref}.supabase.co`;
  const connString = `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
  return { connString };
}

function isDangerous(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();
  return (
    normalized.startsWith("drop ") ||
    normalized.includes(" drop ") ||
    normalized.startsWith("truncate ") ||
    normalized.includes(" truncate ")
  );
}

export async function runSafeSql(params: {
  sql: string;
  allowDestructive?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  const { connString } = getSupabaseDbConfig();
  if (isDangerous(params.sql) && !params.allowDestructive) {
    return { ok: false, message: "SQL destrutivo bloqueado (allowDestructive=false)." };
  }
  const client = new Client({ connectionString: connString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query(params.sql);
    await client.query("COMMIT");
    return { ok: true, message: "SQL executado com sucesso." };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    const message = error instanceof Error ? error.message : "Falha ao executar SQL.";
    return { ok: false, message };
  } finally {
    await client.end().catch(() => undefined);
  }
}
