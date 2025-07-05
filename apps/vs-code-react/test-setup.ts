import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockUseIntl } from './src/__test__/intl-test-helper';
import { InitLoggerService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);
// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

beforeEach(() => {
  mockUseIntl();
});
