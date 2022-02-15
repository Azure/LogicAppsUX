/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * English-locale intl context around them.
 */

import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';
import messages from '../../../../../lib/services/intl/src/compiled-lang/strings.json';
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
  jest.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
};

export const getTestIntl = () => {
  return intl;
};
