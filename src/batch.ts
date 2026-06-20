// batch.ts - Activity batching queue

import { GovernanceActivity, LoggerConfig } from './types';

export class ActivityQueue {
  private queue: GovernanceActivity[] = [];
  private timer: NodeJS.Timeout | null = null;
  private onFlush: (activities: GovernanceActivity[]) => Promise<void>;
  private config: LoggerConfig;

  constructor(
    onFlush: (activities: GovernanceActivity[]) => Promise<void>,
    config: LoggerConfig
  ) {
    this.onFlush = onFlush;
    this.config = config;
  }

  add(activity: GovernanceActivity): void {
    this.queue.push(activity);

    // Flush if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    } else if (!this.timer) {
      // Start timer for batch interval
      this.timer = setTimeout(() => this.flush(), this.config.batchInterval);
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const toSend = [...this.queue];
    this.queue = [];

    try {
      await this.onFlush(toSend);
    } catch (error) {
      // Re-queue on failure
      this.queue.unshift(...toSend);
      throw error;
    }
  }

  size(): number {
    return this.queue.length;
  }
}
