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
        data: { success: true, allowed: true }
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
      expect(response.allowed).toBe(false);
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
      const posted = mockPost.mock.calls[0][1];
      expect(posted).toHaveProperty('reasoning_path', null);
      expect(posted).toHaveProperty('policy_matched', null);
      expect(posted).toHaveProperty('confidence', null);
    });

    test('retry payload preserves decision lineage fields', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000',
        retryAttempts: 2,
        retryDelay: 10
      });

      mockPost
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce({ data: { success: true } });

      await logger.log('test-agent', {
        description: 'Lineage',
        reasoning_path: ['step-a', 'step-b'],
        policy_matched: 'pol-1',
        confidence: 0.8
      });

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost.mock.calls[0][1]).toEqual(mockPost.mock.calls[1][1]);
      expect(mockPost.mock.calls[0][1].reasoning_path).toEqual(['step-a', 'step-b']);
      expect(mockPost.mock.calls[0][1].policy_matched).toBe('pol-1');
      expect(mockPost.mock.calls[0][1].confidence).toBe(0.8);
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

  describe('Blocking Harness', () => {
    test('returns allowed from governor response', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: { success: true, allowed: true, data: { id: 'activity-123' } }
      });

      const response = await logger.logSuccess('test-agent', 'Success', { data: 42 });
      expect(response.allowed).toBe(true);
    });

    test('returns blocked when governor denies', async () => {
      const logger = GovernanceLogger.getInstance({
        governorUrl: 'http://localhost:3000'
      });

      mockPost.mockResolvedValue({
        data: {
          success: true,
          allowed: false,
          violation: 'Restricted file',
          escalationId: 'esc-123'
        }
      });

      const response = await logger.logSuccess('test-agent', 'Blocked step', {});
      expect(response.allowed).toBe(false);
      expect(response.violation).toBe('Restricted file');
      expect(response.escalationId).toBe('esc-123');
    });
  });
});
