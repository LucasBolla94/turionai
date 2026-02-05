import { registerCronHandler } from "./cronManager";
import { runScript } from "../executor/executor";
import { hasUpdatePending } from "./updateStatus";

export function registerAutoUpdateHandler(): void {
  registerCronHandler("update_check", async () => {
    if (await hasUpdatePending()) return;
    const checkScript =
      process.platform === "win32" ? "update_check.ps1" : "update_check.sh";
    let status = "";
    try {
      status = await runScript(checkScript);
    } catch {
      return;
    }
    if (!status.includes("UPDATE_AVAILABLE")) return;
    const updateScript =
      process.platform === "win32" ? "update_self.ps1" : "update_self.sh";
    await runScript(updateScript);
    setTimeout(() => process.exit(0), 1000);
  });
}
