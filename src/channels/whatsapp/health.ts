/**
 * Health checks and status reporting.
 */

import { resolve } from "node:path";
import { checkAiHealth } from "../../core/brain";
import { checkSupabaseHealth } from "../../core/supabaseClient";
import { loadEmailConfig } from "../../core/emailStore";
import { listEmails } from "../../core/emailClient";
import { withTimeout } from "./utils";

export async function readLocalLogSnippet(): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const candidates = [resolve("logs", "error.log"), resolve("logs", "app.log"), resolve("logs", "turion.log")];
  for (const path of candidates) {
    try {
      const data = await readFile(path, "utf8");
      if (data.trim()) {
        return data.slice(-4000);
      }
    } catch {
      // ignore
    }
  }
  return "";
}

export async function checkEmailHealth(): Promise<{ ok: boolean; message: string; configured: boolean }> {
  const config = await loadEmailConfig();
  if (!config) {
    return { ok: false, message: "nao configurado", configured: false };
  }
  try {
    await withTimeout(listEmails(config, { limit: 1, unreadOnly: true }), 8000);
    return { ok: true, message: "ok", configured: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha desconhecida";
    return { ok: false, message, configured: true };
  }
}

export async function buildApiStatusResponse(): Promise<string> {
  const ai = await checkAiHealth();
  const supabase = await checkSupabaseHealth();
  const email = await checkEmailHealth();
  const lines = ["Status das APIs:"];
  if (ai.ok) {
    lines.push("- Anthropic: OK");
  } else if (ai.message.includes("ANTHROPIC_API_KEY")) {
    lines.push("- Anthropic: chave nao configurada");
  } else {
    lines.push(`- Anthropic: erro (${ai.message})`);
  }
  if (supabase.ok) {
    lines.push("- Supabase: OK");
  } else {
    lines.push(`- Supabase: erro (${supabase.message})`);
  }
  if (!email.configured) {
    lines.push("- Email: nao configurado");
  } else if (email.ok) {
    lines.push("- Email: OK");
  } else {
    lines.push(`- Email: erro (${email.message})`);
  }
  lines.push("- WhatsApp: online");

  const fixes: string[] = [];
  if (!ai.ok && ai.message.includes("ANTHROPIC_API_KEY")) {
    fixes.push("Envie sua ANTHROPIC_API_KEY para eu validar na hora.");
  }
  if (!supabase.ok && supabase.message.includes("nao configurado")) {
    fixes.push("Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.");
  }
  if (!email.configured) {
    fixes.push("Se quiser email, diga: conectar email.");
  }
  if (fixes.length) {
    lines.push("");
    lines.push("Como corrigir:");
    lines.push(...fixes.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}
