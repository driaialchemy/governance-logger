// types.ts - TypeScript interfaces for the governance logger

/** Canonical: policy id or name. See docs/decision-lineage-schema.md. */
export type PolicyMatched = string;

export interface GovernanceActivity {
  agentId: string;              // e.g., "workeragentcowork"
  versionId?: string;           // e.g., "1.2.3"
  actionType: ActivityType;     // agent_execution, test_run, etc.
  timestamp: string;            // ISO 8601 format
  description: string;
  evidence?: {
    sourceFile?: string;        // e.g., __filename
    lineNumber?: number;
    functionName?: string;
    metadata?: Record<string, any>;
  };
  result?: {
    success: boolean;
    error?: string;
    output?: any;
    data?: any;
  };
  reasoning_path?: string[] | null;
  policy_matched?: PolicyMatched | null;
  confidence?: number | null;
}

export function buildWebhookPayload(activity: GovernanceActivity): GovernanceActivity {
  return {
    ...activity,
    reasoning_path: activity.reasoning_path ?? null,
    policy_matched: activity.policy_matched ?? null,
    confidence: activity.confidence ?? null,
  };
}

export type ActivityType =
  | "agent_execution_started"
  | "agent_execution_complete"
  | "test_run"
  | "error_occurred"
  | "custom";

export interface LoggerConfig {
  governorUrl: string;          // http://localhost:3000 (from env)
  timeout: number;              // ms, default 5000
  retryAttempts: number;        // default 3
  retryDelay: number;           // ms, default 1000
  batchMode: boolean;           // default false
  batchSize: number;            // default 10
  batchInterval: number;        // ms, default 5000
  debug: boolean;               // default false
}

export interface LoggerResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  attempt: number;
  // Blocking harness fields (from governor)
  allowed?: boolean;            // true = proceed to next agent, false = stop pipeline
  violation?: string;           // why the activity was blocked
  violatedPolicy?: string;      // policy ID that was violated
  escalationId?: string;        // tracking ID for manual override
}
