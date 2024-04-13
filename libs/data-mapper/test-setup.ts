import { afterEach, beforeEach, vi } from 'vitest'
import { mockUseIntl } from './src/lib/__test__/intl-test-helper'
import { initializeIcons } from '@fluentui/react';

import { InitLoggerService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);
console.log = vi.fn();
console.error = vi.fn();
initializeIcons();
// https://testing-library.com/docs/react-testing-library/api#cleanup

beforeEach(() => {
    mockUseIntl();
})