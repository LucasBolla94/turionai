const DEFAULT_ALLOWLIST = ["+447432009032"];

function normalizeDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function normalizeEntry(entry: string): string {
  const trimmed = entry.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("@")) {
    return trimmed;
  }
  return normalizeDigits(trimmed);
}

export function getAllowlist(): Set<string> {
  const envList = process.env.TURION_ALLOWLIST;
  const raw = envList ? envList.split(",") : DEFAULT_ALLOWLIST;
  const normalized = raw.map((entry) => normalizeEntry(entry)).filter(Boolean);
  return new Set(normalized);
}

export function isAuthorized(jid: string | undefined): boolean {
  if (!jid) return false;
  const allowlist = getAllowlist();
  const normalizedJid = jid.trim().toLowerCase();
  if (allowlist.has(normalizedJid)) return true;

  const digits = normalizeDigits(normalizedJid);
  if (digits && allowlist.has(digits)) return true;

  return false;
}
