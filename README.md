# @driaialchemy/governance-logger

Shared npm package for logging AI agent activities to the governance system.

## Overview

This package makes it trivially easy for any AI agent repo to post its activities to the centralized governance system. One line of code, automatic webhook handling, retry logic, and error resilience.

## Installation

```bash
npm install @driaialchemy/governance-logger
```

Or with path (during development):
```bash
npm install ../../governance-logger
```

## Quick Start

```typescript
import { GovernanceLogger } from '@driaialchemy/governance-logger';

const logger = GovernanceLogger.getInstance();

// At the end of your agent execution:
await logger.logSuccess('my-agent', 'Agent completed successfully', {
  itemsProcessed: 100,
  duration: '5.2 seconds'
});
```

## Configuration

Set these environment variables to configure the logger:

```bash
# Governor API URL (required)
GOVERNANCE_URL=http://localhost:3000

# HTTP timeout in milliseconds
GOVERNANCE_TIMEOUT=5000

# Retry configuration
GOVERNANCE_RETRY_ATTEMPTS=3
GOVERNANCE_RETRY_DELAY=1000

# Batch mode (for high-volume scenarios)
GOVERNANCE_BATCH_MODE=false
GOVERNANCE_BATCH_SIZE=10
GOVERNANCE_BATCH_INTERVAL=5000

# Debug logging
GOVERNANCE_DEBUG=false
```

Copy `.env.example` to `.env` in your repo root and customize.

## API Reference

### GovernanceLogger.getInstance(config?)

Get the singleton logger instance. Optional `LoggerConfig` object to override environment variables.

```typescript
const logger = GovernanceLogger.getInstance();
// or
const logger = GovernanceLogger.getInstance({
  governorUrl: 'https://governance.example.com'
});
```

### logger.log(agentId, activity, actionType)

Log a custom activity.

```typescript
await logger.log('my-agent', {
  description: 'Custom event occurred',
  result: { success: true, data: {...} }
}, 'custom');
```

### logger.logSuccess(agentId, description, output?)

Log a successful execution.

```typescript
await logger.logSuccess('my-agent', 'Agent completed', {
  result: data
});
```

### logger.logError(agentId, error)

Log an error.

```typescript
try {
  // ... agent code ...
} catch (error) {
  await logger.logError('my-agent', error);
}
```

### logger.logTest(agentId, testName, passed, output?)

Log test results.

```typescript
await logger.logTest('my-agent', 'unit_test', true, 'All assertions passed');
```

### logger.flush()

Force flush any queued activities (batch mode only).

```typescript
await logger.flush();
```

## Examples

### Basic Usage

```typescript
import { GovernanceLogger } from '@driaialchemy/governance-logger';

async function runAgent() {
  const logger = GovernanceLogger.getInstance();

  try {
    console.log('Starting agent...');
    
    // ... agent execution code ...
    const result = await myAgentFunction();

    // Log success
    await logger.logSuccess('my-agent', 'Agent completed successfully', result);
    
  } catch (error) {
    // Log error
    await logger.logError('my-agent', error);
  }
}

runAgent().then(() => process.exit(0));
```

### With Custom Configuration

```typescript
const logger = GovernanceLogger.getInstance({
  governorUrl: 'https://governance.mycompany.com',
  timeout: 10000,
  retryAttempts: 5,
  batchMode: true,
  debug: true
});

await logger.logSuccess('my-agent', 'Done', { count: 42 });
```

### With Error Handling

```typescript
const response = await logger.logSuccess('my-agent', 'Completed', data);

if (!response.success) {
  console.error('Failed to log to governor:', response.error);
  // Agent continues regardless - governor is non-critical
}
```

### Batch Mode (High Volume)

```typescript
// Set GOVERNANCE_BATCH_MODE=true in .env

const logger = GovernanceLogger.getInstance();

// Activities are queued and sent in batches
for (let i = 0; i < 1000; i++) {
  await logger.log('my-agent', { description: `Activity ${i}` });
}

// Flush remaining activities
await logger.flush();
```

## How It Works

1. **Singleton Pattern**: One instance per process, created on first call
2. **Automatic Retry**: Exponential backoff for network failures
3. **Non-Blocking**: Errors don't crash your agent
4. **Batch Mode**: Optional queuing for high-volume scenarios
5. **Environment Config**: All settings via environment variables

## Response Format

```typescript
interface LoggerResponse {
  success: boolean;      // true if logged successfully
  data?: any;            // governor response data
  error?: string;        // error message if failed
  timestamp: string;     // ISO timestamp
  attempt: number;       // number of retry attempts
}
```

## Troubleshooting

**"Failed to log activity for my-agent"**
- Is the governor running? Check: `curl http://localhost:3000/health`
- Is GOVERNANCE_URL correct? Verify in .env file
- Check governor logs for errors

**"Activities not appearing in dashboard"**
- Did the agent actually call the logger? Add `console.log` before the call
- Did the governor receive it? Check: `curl http://localhost:3000/agents/my-agent/activity-report`
- Is the dashboard filtering by repo? Select "All" repos in dropdown

**"Request timeout"**
- Increase GOVERNANCE_TIMEOUT in .env
- Check network connectivity to governor
- Check governor is not overloaded

## Security

- Never commit `.env` files with real credentials
- Use `.env.example` as a template
- Store GOVERNANCE_URL securely
- Use HTTPS for remote governors

## License

ISC

## Support

For issues or questions about the governance system, check the main repository documentation.
