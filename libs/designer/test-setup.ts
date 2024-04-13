import { afterEach, beforeEach } from 'vitest'
import { mockUseIntl } from './src/lib/__test__/intl-test-helper'
import { initializeIcons } from '@fluentui/react';

import { InitLoggerService } from '@microsoft/logic-apps-shared';
InitLoggerService([]);

initializeIcons();

beforeEach(() => {
    mockUseIntl();
})