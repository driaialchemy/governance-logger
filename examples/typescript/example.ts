// example.ts - Example usage of GovernanceLogger

import { GovernanceLogger } from '../src/GovernanceLogger';

async function exampleAgent() {
  console.log('Starting example agent...');

  const logger = GovernanceLogger.getInstance();

  try {
    // Simulate agent work
    console.log('Processing data...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = {
      itemsProcessed: 42,
      duration: '2 seconds',
      status: 'success'
    };

    // Log success
    const response = await logger.logSuccess(
      'example-agent',
      'Example agent completed successfully',
      result
    );

    console.log('Logger response:', response);

    if (response.success) {
      console.log('✓ Activity logged successfully');
    } else {
      console.log('✗ Failed to log activity:', response.error);
      console.log('  (This is not fatal - agent continues)');
    }

  } catch (error) {
    console.error('Agent error:', error);

    // Log error
    await logger.logError('example-agent', error as Error);
    process.exit(1);
  }
}

// Run the example
exampleAgent()
  .then(() => {
    console.log('Example completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
