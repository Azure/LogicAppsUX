/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * English-locale intl context around them.
 */

import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';
// You can pass your messages to the IntlProvider. Optional: remove if unneeded.
const messages = require('../../compiled-lang/strings.json'); // en.json
const defaultLocale = 'en';
const locale = defaultLocale;

const cache = createIntlCache();

const intl = createIntl(
  {
    locale: defaultLocale,
    messages: messages,
  },
  cache
);

export const mockUseIntl = () => {
  jest.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
};

export const getIntl = () => {
  return intl;
};
