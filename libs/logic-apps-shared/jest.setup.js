import messages from '../services/intl/src/compiled-lang/strings.json';
import { createIntl, createIntlCache } from 'react-intl';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Intl from 'react-intl';

// You can pass your messages to the IntlProvider. Optional: remove if unneeded.
// en.json
const defaultLocale = 'en';

const cache = createIntlCache();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const intl = createIntl(
  {
    locale: defaultLocale,
    messages: messages,
  },
  cache
);
