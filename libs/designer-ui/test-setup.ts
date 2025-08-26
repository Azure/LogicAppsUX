import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockUseIntl } from './src/lib/__test__/intl-test-helper';
import { setIconOptions } from '@fluentui/react/lib/Styling';

setIconOptions({ disableWarnings: true });

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

beforeEach(() => {
  mockUseIntl();
});
