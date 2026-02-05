import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomInt } from "node:crypto";

export interface OwnerState {
  owner_jid?: string;
  owner_name?: string;
  assistant_name?: string;
  owner_role?: string;
  pairing_code?: string;
  created_at: string;
  paired_at?: string;
  setup_done?: boolean;
  city?: string;
  country?: string;
  timezone?: string;
  language?: string;
  tone?: string;
  response_detail?: string;
  goal?: string;
}

const OWNER_DIR = resolve("state", "persona");
const OWNER_PATH = resolve(OWNER_DIR, "owner.json");
const LEGACY_OWNER_DIR = resolve("state", "memory");
const LEGACY_OWNER_PATH = resolve(LEGACY_OWNER_DIR, "owner.json");
const FALLBACK_OWNER_DIR = resolve("state");
const FALLBACK_OWNER_PATH = resolve(FALLBACK_OWNER_DIR, "owner.json");

async function loadOwnerState(): Promise<OwnerState | null> {
  try {
    const data = await readFile(OWNER_PATH, "utf8");
    return JSON.parse(data) as OwnerState;
  } catch {
    try {
      const legacy = await readFile(LEGACY_OWNER_PATH, "utf8");
      const parsed = JSON.parse(legacy) as OwnerState;
      await saveOwnerState(parsed);
      return parsed;
    } catch {
      try {
        const fallback = await readFile(FALLBACK_OWNER_PATH, "utf8");
        const parsed = JSON.parse(fallback) as OwnerState;
        await saveOwnerState(parsed);
        return parsed;
      } catch {
        return null;
      }
    }
  }
}

export async function getOwnerState(): Promise<OwnerState | null> {
  return loadOwnerState();
}

export async function saveOwnerState(state: OwnerState): Promise<void> {
  await mkdir(OWNER_DIR, { recursive: true });
  await writeFile(OWNER_PATH, JSON.stringify(state, null, 2), "utf8");
  try {
    await mkdir(LEGACY_OWNER_DIR, { recursive: true });
    await writeFile(LEGACY_OWNER_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // ignore legacy write failures
  }
  try {
    await mkdir(FALLBACK_OWNER_DIR, { recursive: true });
    await writeFile(FALLBACK_OWNER_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // ignore fallback write failures
  }
}

export async function ensurePairingCode(): Promise<string> {
  const existing = await loadOwnerState();
  if (existing?.pairing_code) {
    return existing.pairing_code;
  }
  const code = String(randomInt(100000, 999999));
  const payload: OwnerState = {
    ...(existing ?? { created_at: new Date().toISOString() }),
    pairing_code: code,
  };
  await saveOwnerState(payload);
  return code;
}

export async function setOwner(jid: string): Promise<OwnerState> {
  const existing = (await loadOwnerState()) ?? {
    created_at: new Date().toISOString(),
  };
  const updated: OwnerState = {
    ...existing,
    owner_jid: jid,
    paired_at: new Date().toISOString(),
  };
  await saveOwnerState(updated);
  return updated;
}

export async function updateOwnerDetails(patch: Partial<OwnerState>): Promise<OwnerState> {
  const existing = (await loadOwnerState()) ?? {
    created_at: new Date().toISOString(),
  };
  const updated: OwnerState = { ...existing, ...patch };
  await saveOwnerState(updated);
  return updated;
}
