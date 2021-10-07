/* eslint-disable react/jsx-no-useless-fragment */
import React from 'react';
import { createIntl, createIntlCache, IntlShape, useIntl } from 'react-intl';

interface IntlGlobalProviderProps {
  children: React.ReactNode;
}
const cache = createIntlCache();
let INTL: IntlShape | undefined;
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

export default IntlGlobalProvider;
