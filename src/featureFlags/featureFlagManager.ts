/**
 * Feature Flag Manager - V1.1.1 STEP-07
 *
 * Centralized feature flag management system with:
 * - Global flags
 * - Per-user overrides
 * - Environment variable integration
 * - Persistence in JSON
 * - Change history
 */

import fs from "fs/promises";
import path from "path";
import type {
  FeatureFlag,
  UserFlagOverride,
  FlagChangeEntry,
  FeatureFlagConfig,
  FlagEvaluationResult,
} from "./types";

export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private userOverrides: Map<string, Map<string, UserFlagOverride>> = new Map();
  private history: FlagChangeEntry[] = [];
  private config: Required<FeatureFlagConfig>;
  private saveDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: FeatureFlagConfig = {}) {
    this.config = {
      storagePath: config.storagePath || "state/feature-flags",
      autoSave: config.autoSave !== undefined ? config.autoSave : true,
      maxHistorySize: config.maxHistorySize || 1000,
    };
  }

  /**
   * Initialize the manager (load from disk)
   */
  async initialize(): Promise<void> {
    console.log("[FeatureFlagManager] Inicializando...");

    try {
      // Ensure storage directory exists
      await fs.mkdir(this.config.storagePath, { recursive: true });

      // Load flags
      await this.loadFlags();

      // Load user overrides
      await this.loadUserOverrides();

      // Load history
      await this.loadHistory();

      console.log(`[FeatureFlagManager] Inicializado com ${this.flags.size} flags`);
    } catch (error) {
      console.error("[FeatureFlagManager] Erro ao inicializar:", error);
      throw error;
    }
  }

  /**
   * Register a new feature flag
   */
  registerFlag(params: {
    key: string;
    name: string;
    description: string;
    defaultValue: boolean;
    category?: FeatureFlag["category"];
  }): void {
    const now = new Date().toISOString();

    const flag: FeatureFlag = {
      key: params.key,
      name: params.name,
      description: params.description,
      defaultValue: params.defaultValue,
      enabled: params.defaultValue,
      category: params.category || "core",
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(params.key, flag);
    console.log(`[FeatureFlagManager] Flag registrada: ${params.key}`);

    if (this.config.autoSave) {
      this.debouncedSave("flags");
    }
  }

  /**
   * Get flag value for a user (checks env, user override, global, default)
   */
  isEnabled(flagKey: string, userId?: string): boolean {
    const result = this.evaluate(flagKey, userId);
    return result.enabled;
  }

  /**
   * Evaluate flag with full details
   */
  evaluate(flagKey: string, userId?: string): FlagEvaluationResult {
    const flag = this.flags.get(flagKey);

    // Check environment variable first (highest priority)
    const envValue = this.getEnvValue(flagKey);
    if (envValue !== undefined) {
      return {
        key: flagKey,
        enabled: envValue,
        source: "env",
        metadata: flag,
      };
    }

    // Check user override
    if (userId) {
      const userOverride = this.getUserOverride(flagKey, userId);
      if (userOverride) {
        return {
          key: flagKey,
          enabled: userOverride.enabled,
          source: "user_override",
          metadata: flag,
        };
      }
    }

    // Check global flag value
    if (flag) {
      return {
        key: flagKey,
        enabled: flag.enabled,
        source: "global",
        metadata: flag,
      };
    }

    // Fallback to default (false)
    return {
      key: flagKey,
      enabled: false,
      source: "default",
    };
  }

  /**
   * Set global flag value
   */
  async setFlag(
    flagKey: string,
    enabled: boolean,
    changedBy: string = "system",
    reason?: string
  ): Promise<void> {
    const flag = this.flags.get(flagKey);
    if (!flag) {
      throw new Error(`Flag não encontrada: ${flagKey}`);
    }

    const oldValue = flag.enabled;
    flag.enabled = enabled;
    flag.updatedAt = new Date().toISOString();

    // Record change in history
    this.addHistoryEntry({
      flagKey,
      oldValue,
      newValue: enabled,
      changedBy,
      timestamp: flag.updatedAt,
      reason,
    });

    console.log(`[FeatureFlagManager] Flag atualizada: ${flagKey} = ${enabled}`);

    if (this.config.autoSave) {
      this.debouncedSave("flags");
      this.debouncedSave("history");
    }
  }

  /**
   * Set user-specific override
   */
  async setUserOverride(
    flagKey: string,
    userId: string,
    enabled: boolean,
    changedBy: string = "system"
  ): Promise<void> {
    if (!this.flags.has(flagKey)) {
      throw new Error(`Flag não encontrada: ${flagKey}`);
    }

    let userMap = this.userOverrides.get(userId);
    if (!userMap) {
      userMap = new Map();
      this.userOverrides.set(userId, userMap);
    }

    const override: UserFlagOverride = {
      userId,
      flagKey,
      enabled,
      setAt: new Date().toISOString(),
    };

    userMap.set(flagKey, override);

    console.log(`[FeatureFlagManager] Override para usuário ${userId}: ${flagKey} = ${enabled}`);

    if (this.config.autoSave) {
      this.debouncedSave("userOverrides");
    }
  }

  /**
   * Remove user override
   */
  async removeUserOverride(flagKey: string, userId: string): Promise<void> {
    const userMap = this.userOverrides.get(userId);
    if (userMap) {
      userMap.delete(flagKey);
      if (userMap.size === 0) {
        this.userOverrides.delete(userId);
      }

      console.log(`[FeatureFlagManager] Override removido: ${userId}/${flagKey}`);

      if (this.config.autoSave) {
        this.debouncedSave("userOverrides");
      }
    }
  }

  /**
   * Get all registered flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flag details
   */
  getFlag(flagKey: string): FeatureFlag | undefined {
    return this.flags.get(flagKey);
  }

  /**
   * Get user override
   */
  getUserOverride(flagKey: string, userId: string): UserFlagOverride | undefined {
    return this.userOverrides.get(userId)?.get(flagKey);
  }

  /**
   * Get all overrides for a user
   */
  getUserOverrides(userId: string): UserFlagOverride[] {
    const userMap = this.userOverrides.get(userId);
    return userMap ? Array.from(userMap.values()) : [];
  }

  /**
   * Get flag change history
   */
  getHistory(flagKey?: string, limit: number = 100): FlagChangeEntry[] {
    let entries = this.history;

    if (flagKey) {
      entries = entries.filter((e) => e.flagKey === flagKey);
    }

    return entries.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    const enabledCount = Array.from(this.flags.values()).filter((f) => f.enabled).length;

    return {
      totalFlags: this.flags.size,
      enabledFlags: enabledCount,
      disabledFlags: this.flags.size - enabledCount,
      userOverrides: this.userOverrides.size,
      historyEntries: this.history.length,
    };
  }

  /**
   * Flush all pending saves (useful for tests)
   */
  async flush(): Promise<void> {
    // Clear all debounce timers and save immediately
    for (const [type, timeout] of this.saveDebounceTimers.entries()) {
      clearTimeout(timeout);
      this.saveDebounceTimers.delete(type);
    }

    // Save everything
    await this.saveFlags();
    await this.saveUserOverrides();
    await this.saveHistory();
  }

  // ===== PRIVATE METHODS =====

  private getEnvValue(flagKey: string): boolean | undefined {
    // Convert flag key to env var format
    // Example: "brain_v2" -> "TURION_USE_BRAIN_V2"
    const envKey = `TURION_USE_${flagKey.toUpperCase()}`;
    const envValue = process.env[envKey];

    if (envValue === undefined) {
      return undefined;
    }

    return envValue === "true" || envValue === "1";
  }

  private addHistoryEntry(entry: FlagChangeEntry): void {
    this.history.push(entry);

    // Trim history if too large
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  private debouncedSave(type: "flags" | "userOverrides" | "history"): void {
    // Clear existing timeout
    const existing = this.saveDebounceTimers.get(type);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new timeout (100ms debounce)
    const timeout = setTimeout(() => {
      if (type === "flags") {
        this.saveFlags().catch(console.error);
      } else if (type === "userOverrides") {
        this.saveUserOverrides().catch(console.error);
      } else if (type === "history") {
        this.saveHistory().catch(console.error);
      }
      this.saveDebounceTimers.delete(type);
    }, 100);

    this.saveDebounceTimers.set(type, timeout);
  }

  // ===== PERSISTENCE =====

  private async loadFlags(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "flags.json");

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const flags: FeatureFlag[] = JSON.parse(data);

      for (const flag of flags) {
        this.flags.set(flag.key, flag);
      }

      console.log(`[FeatureFlagManager] Carregadas ${flags.length} flags`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("[FeatureFlagManager] Nenhuma flag salva encontrada (primeira execução)");
      } else {
        throw error;
      }
    }
  }

  private async saveFlags(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "flags.json");
    const flags = Array.from(this.flags.values());

    await fs.writeFile(filePath, JSON.stringify(flags, null, 2), "utf-8");
  }

  private async loadUserOverrides(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "user-overrides.json");

    try {
      const data = await fs.readFile(filePath, "utf-8");
      const overrides: UserFlagOverride[] = JSON.parse(data);

      for (const override of overrides) {
        let userMap = this.userOverrides.get(override.userId);
        if (!userMap) {
          userMap = new Map();
          this.userOverrides.set(override.userId, userMap);
        }
        userMap.set(override.flagKey, override);
      }

      console.log(`[FeatureFlagManager] Carregados ${overrides.length} overrides`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("[FeatureFlagManager] Nenhum override encontrado");
      } else {
        throw error;
      }
    }
  }

  private async saveUserOverrides(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "user-overrides.json");
    const overrides: UserFlagOverride[] = [];

    for (const userMap of this.userOverrides.values()) {
      overrides.push(...Array.from(userMap.values()));
    }

    await fs.writeFile(filePath, JSON.stringify(overrides, null, 2), "utf-8");
  }

  private async loadHistory(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "history.json");

    try {
      const data = await fs.readFile(filePath, "utf-8");
      this.history = JSON.parse(data);

      console.log(`[FeatureFlagManager] Carregado histórico com ${this.history.length} entradas`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("[FeatureFlagManager] Nenhum histórico encontrado");
      } else {
        throw error;
      }
    }
  }

  private async saveHistory(): Promise<void> {
    const filePath = path.join(this.config.storagePath, "history.json");
    await fs.writeFile(filePath, JSON.stringify(this.history, null, 2), "utf-8");
  }
}
