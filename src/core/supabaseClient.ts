import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseEnv(): {
  url: string | null;
  serviceRoleKey: string | null;
} {
  const url = process.env.SUPABASE_URL ?? null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  return { url, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.serviceRoleKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase nao configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export async function checkSupabaseHealth(): Promise<{ ok: boolean; message: string }> {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    return { ok: false, message: "Supabase nao configurado" };
  }
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (response.ok) {
      return { ok: true, message: "OK" };
    }
    const text = await response.text();
    return { ok: false, message: `HTTP ${response.status}: ${text}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";
    return { ok: false, message };
  }
}
