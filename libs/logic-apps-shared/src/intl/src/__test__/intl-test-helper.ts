/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * English-locale intl context around them.
 */
import messages from '../../compiled-lang/strings.json';
import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';
import { vi } from 'vitest';
// You can pass your messages to the IntlProvider. Optional: remove if unneeded.
// en.json
const defaultLocale = 'en';

const cache = createIntlCache();

const intl = createIntl(
  {
    locale: defaultLocale,
    messages: messages,
  },
  cache
);

export const mockUseIntl = () => {
  vi.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
};

export const getTestIntl = () => {
  return intl;
};
