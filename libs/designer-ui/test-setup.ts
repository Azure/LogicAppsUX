import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockUseIntl } from './src/lib/__test__/intl-test-helper';
import { initializeIcons } from '@fluentui/react';

// Suppress console errors from tabster/NodeFilter that don't affect test results
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('NodeFilter is not defined') || message.includes('Node is not defined')) {
    return; // Suppress these specific errors
  }
  originalConsoleError.apply(console, args);
};

initializeIcons();
// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

beforeEach(() => {
  mockUseIntl();
});
