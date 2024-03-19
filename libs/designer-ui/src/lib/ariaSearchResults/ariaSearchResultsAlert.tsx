import { useIntl } from 'react-intl';

export const AriaSearchResultsAlert = (props: { resultCount: number; resultDescription: string }) => {
  const intl = useIntl();
  const ariaResultCount = intl.formatMessage({
    defaultMessage: ' results found',
    id: 't/RPwA',
    description: 'shows how many results are returned after search',
  });
  return (
    <div className={'msla-aria-search-results'} role="alert">{`${props.resultCount} ${props.resultDescription} ${ariaResultCount}`}</div>
  );
};
