import type React from 'react';
import type { IntlShape } from 'react-intl';
import { createIntl, createIntlCache, useIntl } from 'react-intl';

interface IntlGlobalProviderProps {
  children: React.ReactNode;
}
const cache = createIntlCache();
let INTL: IntlShape | undefined;
export const resetIntl = () => (INTL = undefined);
const IntlGlobalProvider = (props: IntlGlobalProviderProps) => {
  INTL = useIntl();
  return <>{props.children}</>;
};

export const getIntl = () => {
  return (
    INTL ??
    createIntl(
      {
        locale: 'en',
        messages: {},
        defaultLocale: 'en',
      },
      cache
    )
  );
};

export { IntlGlobalProvider };
