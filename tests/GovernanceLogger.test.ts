// GovernanceLogger.test.ts - Jest test suite

import { GovernanceLogger } from '../src/GovernanceLogger';
import * as axios from 'axios';

jest.mock('axios');

let mockPost: jest.Mock;

describe('GovernanceLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GovernanceLogger as any).instance = undefined;
    mockPost = jest.fn();
    (axios.create as jest.Mock).mockReturnValue({
      post: mockPost
    });
  });

  describe('Singleton Pattern', () => {
    test('getInstance returns same instance', () => {
      const logger1 = GovernanceLogger.getInstance();
      const logger2 = GovernanceLogger.getInstance();
      expect(logger1).toBe(logger2);
    });

    test('getInstance with config creates new instance', () => {
      const config = { governorUrl: 'http://test.com' };
      const logger = GovernanceLogger.getInstance(config);
      expect(logger).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('loads config from environment', () => {
      process.env.GOVERNANCE_URL = 'http://custom.com';
      const logger = GovernanceLogger.getInstance();
      expect(logger).toBeDefined();
    });

    test('throws error when GOVERNANCE_URL missing', () => {
      delete process.env.GOVERNANCE_URL;
      expect(() => {
        GovernanceLogger.getInstance({ governorUrl: '' });
      }).toThrow('GOVERNANCE_URL environment variable is required');
    });
  });

  describe('Activity Logging', () => {
    test('log returns LoggerResponse', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: { success: true, data: { id: 'activity-123' } }
      });

      const response = await logger.log('test-agent', {
        description: 'Test activity'
      });

      expect(response.success).toBe(true);
      expect(response.timestamp).toBeDefined();
    });

    test('logSuccess helper works', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: { success: true }
      });

      const response = await logger.logSuccess('test-agent', 'Success', { data: 42 });

      expect(response.success).toBe(true);
    });

    test('logError helper works', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: { success: true }
      });

      const response = await logger.logError('test-agent', new Error('Test error'));

      expect(response.success).toBe(true);
    });

    test('logTest helper works', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: { success: true }
      });

      const response = await logger.logTest('test-agent', 'test_name', true, 'output');

      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000',
        retryAttempts: 1
      });

      mockPost.mockRejectedValue(new Error('Network error'));

      const response = await logger.log('test-agent', {
        description: 'Test'
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    test('does not crash on logging failure', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000',
        retryAttempts: 1
      });

      mockPost.mockRejectedValue(new Error('Server error'));

      const response = await logger.log('test-agent', { description: 'Test' });
      expect(response.success).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    test('retries on failure', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000',
        retryAttempts: 3,
        retryDelay: 10
      });

      mockPost
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ data: { success: true } });

      const response = await logger.log('test-agent', { description: 'Test' });

      expect(mockPost).toHaveBeenCalledTimes(3);
      expect(response.success).toBe(true);
    });
  });

  describe('Batch Mode', () => {
    test('queues activities in batch mode', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000',
        batchMode: true,
        batchSize: 2
      });

      mockPost.mockResolvedValue({
        data: { success: true }
      });

      await logger.log('test-agent', { description: 'Activity 1' });
      await logger.log('test-agent', { description: 'Activity 2' });
      await logger.flush();

      expect(mockPost).toHaveBeenCalled();
    });
  });
});
