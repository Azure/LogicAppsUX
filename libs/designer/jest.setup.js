import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';
import messages from '../../Localize/compiled-lang/strings.json';

/* eslint-disable @typescript-eslint/no-empty-function */
class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }

  postMessage(msg) {
    this.onmessage(msg);
  }
}
window.Worker = Worker;

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
