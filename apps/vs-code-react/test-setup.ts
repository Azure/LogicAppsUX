import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { mockUseIntl } from './src/__test__/intl-test-helper';

import { InitLoggerService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);

// Mock acquireVsCodeApi which is a VS Code webview global
if (typeof globalThis.acquireVsCodeApi === 'undefined') {
  (globalThis as any).acquireVsCodeApi = () => ({
    postMessage: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
  });
}

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

beforeEach(() => {
  mockUseIntl();
});
