import { afterEach, beforeEach, vi } from 'vitest'
import { mockUseIntl } from './src/lib/__test__/intl-test-helper'
import { initializeIcons } from '@fluentui/react';
import { InitLoggerService, InitChatbotService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);
InitChatbotService({
    getCopilotResponse: async (query: string, workflow: any, signal: AbortSignal, armToken: string) => {
        return { data: {} } as any;
    }
})
initializeIcons();
// https://testing-library.com/docs/react-testing-library/api#cleanup

beforeEach(() => {
    mockUseIntl();
})