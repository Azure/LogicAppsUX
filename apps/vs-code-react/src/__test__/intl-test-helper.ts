import * as ReactIntl from 'react-intl';
import { vi } from 'vitest';

export const mockUseIntl = () => {
  const useIntlSpy = vi.spyOn(ReactIntl, 'useIntl');
  useIntlSpy.mockReturnValue({
    formatMessage: ({ id, defaultMessage }) => defaultMessage || id,
    formatNumber: (value) => String(value),
    formatDate: (value) => new Date(value).toISOString(),
    formatTime: (value) => new Date(value).toISOString(),
  } as any);
};
