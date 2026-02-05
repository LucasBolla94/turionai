import os from "node:os";
import { getInteractionState } from "./interaction";

const DEFAULT_IDLE_MINUTES = 15;
const MAX_LOAD = 0.6;
const MIN_FREE_MEM_RATIO = 0.2;

export async function isIdleNow(): Promise<{ ok: boolean; reason?: string }> {
  const state = await getInteractionState();
  if (!state.lastInteractionAt) {
    return { ok: true };
  }
  const last = new Date(state.lastInteractionAt).getTime();
  const now = Date.now();
  const minutes = (now - last) / 1000 / 60;
  if (minutes < DEFAULT_IDLE_MINUTES) {
    return { ok: false, reason: "Usuario ativo recentemente" };
  }
  const load = os.loadavg?.()[0] ?? 0;
  if (load > MAX_LOAD) {
    return { ok: false, reason: "CPU ocupada" };
  }
  const free = os.freemem();
  const total = os.totalmem();
  const ratio = total > 0 ? free / total : 1;
  if (ratio < MIN_FREE_MEM_RATIO) {
    return { ok: false, reason: "Memoria baixa" };
  }
  return { ok: true };
}
