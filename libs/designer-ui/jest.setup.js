import messages from '../services/intl/src/compiled-lang/strings.json';
import { initializeIcons } from '@fluentui/react';
import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';

initializeIcons();

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

jest.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
