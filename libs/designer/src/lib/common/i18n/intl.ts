import { store } from '../../core/store';
import { createIntl, createIntlCache } from 'react-intl';

//NOTE: This is for localizing messages outside of react components. DO NOT call thsi from in a react component.
// useIntl will have better cache hit rate and be more performant.
const cache = createIntlCache();
export const getIntl = () => {
  const i18n = store.getState().localization;

  return createIntl(
    {
      locale: i18n.locale,
      messages: i18n.messages,
      defaultLocale: i18n.defaultLocale,
    },
    cache
  );
};
