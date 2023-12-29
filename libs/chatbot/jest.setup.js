// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import messages from '../services/intl/src/compiled-lang/strings.json';
import { InitLoggerService } from '@microsoft/designer-client-services-logic-apps';
import { createIntl, createIntlCache } from 'react-intl';
import * as Intl from 'react-intl';

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

InitLoggerService([]);
jest.spyOn(Intl, 'useIntl').mockImplementation(() => intl);
