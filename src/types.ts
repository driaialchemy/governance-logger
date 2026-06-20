// types.ts - TypeScript interfaces for the governance logger

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
}
