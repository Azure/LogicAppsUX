import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockUseIntl } from './src/lib/__test__/intl-test-helper';
import { initializeIcons } from '@fluentui/react';
import { InitLoggerService, InitChatbotService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);
InitChatbotService({
  getCopilotResponse: async (_query: string, _workflow: any, _signal: AbortSignal, _armToken: string) => {
    return { data: {} } as any;
  },
});
initializeIcons();
// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

beforeEach(() => {
  mockUseIntl();
});
