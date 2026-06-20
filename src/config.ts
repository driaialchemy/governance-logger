// config.ts - Configuration management

import { LoggerConfig } from './types';

export function getConfig(): LoggerConfig {
  return {
    governorUrl: process.env.GOVERNANCE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.GOVERNANCE_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.GOVERNANCE_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.GOVERNANCE_RETRY_DELAY || '1000', 10),
    batchMode: process.env.GOVERNANCE_BATCH_MODE === 'true',
    batchSize: parseInt(process.env.GOVERNANCE_BATCH_SIZE || '10', 10),
    batchInterval: parseInt(process.env.GOVERNANCE_BATCH_INTERVAL || '5000', 10),
    debug: process.env.GOVERNANCE_DEBUG === 'true'
  };
}

export function validateConfig(config: LoggerConfig): void {
  if (!config.governorUrl) {
    throw new Error('GOVERNANCE_URL environment variable is required');
  }
  if (!config.governorUrl.startsWith('http')) {
    throw new Error('GOVERNANCE_URL must start with http or https');
  }
}

export function logDebug(message: string, data?: any): void {
  if (getConfig().debug) {
    console.log(`[GovernanceLogger] ${message}`, data || '');
  }
}
