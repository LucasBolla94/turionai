import { getSupabaseClient } from "./supabaseClient";
import { runSafeSql } from "./supabaseDb";

export async function createBucket(name: string, isPublic = false): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  const { error } = await client.storage.createBucket(name, { public: isPublic });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Bucket criado." };
}

export async function listBuckets(): Promise<{ ok: boolean; buckets: string[]; message?: string }> {
  const client = getSupabaseClient();
  const { data, error } = await client.storage.listBuckets();
  if (error) return { ok: false, buckets: [], message: error.message };
  const buckets = data?.map((item) => item.name) ?? [];
  return { ok: true, buckets };
}

export async function createTable(sql: string): Promise<{ ok: boolean; message: string }> {
  return runSafeSql({ sql, allowDestructive: false });
}

export async function createIndex(sql: string): Promise<{ ok: boolean; message: string }> {
  return runSafeSql({ sql, allowDestructive: false });
}

export async function runMigration(sql: string, allowDestructive = false): Promise<{ ok: boolean; message: string }> {
  return runSafeSql({ sql, allowDestructive });
}
