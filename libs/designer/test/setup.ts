import messages from '../src/intl/compiled-lang/strings.json';
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

vi.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
