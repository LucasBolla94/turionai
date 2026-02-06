/**
 * Feature Flags Types - V1.1.1 STEP-07
 * Type definitions for feature flag system
 */

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  /** Unique flag identifier (e.g., "brain_v2", "auto_approval") */
  key: string;

  /** Human-readable name */
  name: string;

  /** Flag description */
  description: string;

  /** Default value */
  defaultValue: boolean;

  /** Current global value */
  enabled: boolean;

  /** Flag category for organization */
  category: "core" | "experimental" | "beta" | "deprecated";

  /** When this flag was created */
  createdAt: string;

  /** Last modification timestamp */
  updatedAt: string;
}

/**
 * User-specific flag override
 */
export interface UserFlagOverride {
  /** User ID */
  userId: string;

  /** Flag key */
  flagKey: string;

  /** Override value */
  enabled: boolean;

  /** When this override was set */
  setAt: string;
}

/**
 * Flag change history entry
 */
export interface FlagChangeEntry {
  /** Flag key */
  flagKey: string;

  /** Previous value */
  oldValue: boolean;

  /** New value */
  newValue: boolean;

  /** Who made the change (user ID or "system") */
  changedBy: string;

  /** When the change happened */
  timestamp: string;

  /** Optional reason for the change */
  reason?: string;
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  /** Storage file path */
  storagePath?: string;

  /** Whether to auto-save on changes */
  autoSave?: boolean;

  /** Maximum history entries to keep */
  maxHistorySize?: number;
}

/**
 * Flag evaluation result
 */
export interface FlagEvaluationResult {
  /** Flag key */
  key: string;

  /** Evaluated value */
  enabled: boolean;

  /** Source of the value */
  source: "user_override" | "global" | "default" | "env";

  /** Flag metadata */
  metadata?: FeatureFlag;
}
