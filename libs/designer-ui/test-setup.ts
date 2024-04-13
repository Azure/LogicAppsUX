import { afterEach, beforeEach } from 'vitest'
import { mockUseIntl } from './src/lib/__test__/intl-test-helper'
import { initializeIcons } from '@fluentui/react';

initializeIcons();

beforeEach(() => {
    mockUseIntl();
})