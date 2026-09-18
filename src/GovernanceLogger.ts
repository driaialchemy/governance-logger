// GovernanceLogger.ts - Main logger class

import axios, { AxiosInstance } from 'axios';
import { GovernanceActivity, LoggerConfig, LoggerResponse, ActivityType, buildWebhookPayload } from './types';
import { getConfig, validateConfig, logDebug } from './config';
import { retryWithBackoff } from './retry';
import { ActivityQueue } from './batch';

export class GovernanceLogger {
  private static instance: GovernanceLogger;
  private client: AxiosInstance;
  private config: LoggerConfig;
  private queue: ActivityQueue | null = null;

  private constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...getConfig(), ...config };
    validateConfig(this.config);

    this.client = axios.create({
      baseURL: this.config.governorUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.config.batchMode) {
      this.queue = new ActivityQueue(
        (activities) => this.postBatch(activities),
        this.config
      );
    }

    logDebug('GovernanceLogger initialized', { url: this.config.governorUrl });
  }

  static getInstance(config?: Partial<LoggerConfig>): GovernanceLogger {
    if (!GovernanceLogger.instance) {
      GovernanceLogger.instance = new GovernanceLogger(config);
    }
    return GovernanceLogger.instance;
  }

  async log(
    agentId: string,
    activity: Partial<GovernanceActivity>,
    actionType: ActivityType = 'agent_execution_complete'
  ): Promise<LoggerResponse> {
    const fullActivity: GovernanceActivity = {
      agentId,
      actionType,
      timestamp: new Date().toISOString(),
      description: activity.description || `Agent ${agentId} completed ${actionType}`,
      ...activity,
    };

    logDebug('Logging activity', { agentId, actionType });

    if (this.config.batchMode && this.queue) {
      this.queue.add(fullActivity);
      return {
        success: true,
        timestamp: new Date().toISOString(),
        attempt: 1,
      };
    } else {
      return this.postActivity(agentId, fullActivity);
    }
  }

  private async postActivity(
    agentId: string,
    activity: GovernanceActivity
  ): Promise<LoggerResponse> {
    const attempt = this.config.retryAttempts;
    const payload = buildWebhookPayload(activity);

    return retryWithBackoff(
      async () => {
        const response = await this.client.post(
          `/agents/${agentId}/activity`,
          payload
        );

        logDebug('Activity logged successfully', { agentId, id: response.data.data?.id });

        const governorResponse = response.data;

        return {
          success: true,
          data: governorResponse.data,
          timestamp: new Date().toISOString(),
          attempt,
          allowed: governorResponse.allowed ?? true,
          violation: governorResponse.violation,
          violatedPolicy: governorResponse.violatedPolicy,
          escalationId: governorResponse.escalationId,
        };
      },
      this.config.retryAttempts,
      this.config.retryDelay
    ).catch((error) => {
      console.error(`[GovernanceLogger] Failed to log activity for ${agentId}:`, error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        attempt,
        allowed: false,
        violation: `Failed to get governance approval: ${error.message}`,
      };
    });
  }

  private async postBatch(activities: GovernanceActivity[]): Promise<void> {
    logDebug('Posting batch', { count: activities.length });

    for (const activity of activities) {
      await this.postActivity(activity.agentId, activity);
    }
  }

  async flush(): Promise<void> {
    if (this.queue) {
      await this.queue.flush();
    }
  }

  // Helper methods for common activities
  async logSuccess(
    agentId: string,
    description: string,
    output?: any,
    confidence?: number | null
  ): Promise<LoggerResponse> {
    return this.log(agentId, {
      description,
      result: { success: true, output },
      confidence: confidence ?? null,
    });
  }

  async logError(agentId: string, error: Error | string): Promise<LoggerResponse> {
    const description = typeof error === 'string' ? error : error.message;
    return this.log(agentId, {
      description: `Error: ${description}`,
      result: { success: false, error: description },
      actionType: 'error_occurred',
    });
  }

  async logTest(
    agentId: string,
    testName: string,
    passed: boolean,
    output?: string
  ): Promise<LoggerResponse> {
    return this.log(agentId, {
      description: `Test: ${testName} - ${passed ? 'PASSED' : 'FAILED'}`,
      result: { success: passed, output },
      actionType: 'test_run',
      evidence: { functionName: testName },
    });
  }
}

export default GovernanceLogger;
