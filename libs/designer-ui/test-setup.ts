import { afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { mockUseIntl } from './src/lib/__test__/intl-test-helper';
import { initializeIcons } from '@fluentui/react';

vi.mock('tabster', () => ({
  getTabster: () => ({ dispose: vi.fn() }),
  disposeTabster: () => {},
  Types: {},
  createTabster: () => ({}),
}));
(globalThis as any).Node = globalThis.Node ?? class {};

initializeIcons();

afterEach(() => cleanup());
beforeEach(() => {
  mockUseIntl();
});
