import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface GitHubState {
  auth_method: "ssh";
  ssh_key_name: string;
  ssh_pub_fingerprint?: string;
  known_hosts_ready: boolean;
  default_mode: "deploy_key";
  last_test?: { ok: boolean; ts: string };
}

const INTEGRATION_DIR = resolve("state", "memory", "integrations");
const STATE_PATH = resolve(INTEGRATION_DIR, "github.json");

export async function loadGitHubState(): Promise<GitHubState | null> {
  try {
    const data = await readFile(STATE_PATH, "utf8");
    return JSON.parse(data) as GitHubState;
  } catch {
    return null;
  }
}

export async function saveGitHubState(state: GitHubState): Promise<void> {
  await mkdir(INTEGRATION_DIR, { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}
