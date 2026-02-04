const DEFAULT_ALLOWLIST = ["+447432009032"];

function normalizeNumber(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export function getAllowlist(): Set<string> {
  const envList = process.env.TURION_ALLOWLIST;
  const raw = envList ? envList.split(",") : DEFAULT_ALLOWLIST;
  return new Set(raw.map((entry) => normalizeNumber(entry)));
}

export function isAuthorized(jid: string | undefined): boolean {
  if (!jid) return false;
  const normalized = normalizeNumber(jid);
  if (!normalized) return false;
  return getAllowlist().has(normalized);
}
