/**
 * Test script to verify SSE generator output
 */

import { generateSSEResponse } from './mocks/sse-generators';

const requestId = 'test-request-123';
const userMessage = 'require auth';

console.log('=== Testing SSE Generator for "require auth" ===\n');

const sseResponse = generateSSEResponse(requestId, userMessage);

console.log('Generated SSE Response:');
console.log(sseResponse);

console.log('\n=== Parsing each event ===\n');

// Split by double newline to get individual events
const events = sseResponse.split('\n\n').filter((e) => e.trim());

events.forEach((event, index) => {
  console.log(`Event ${index + 1}:`);
  if (event.startsWith('data: ')) {
    const jsonStr = event.substring(6); // Remove 'data: ' prefix
    try {
      const parsed = JSON.parse(jsonStr);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Failed to parse:', jsonStr);
    }
  } else {
    console.log('Non-data event:', event);
  }
  console.log('---');
});
