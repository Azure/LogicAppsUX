import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

interface AriaSearchResultsAlertProps {
  resultCount: number;
  resultDescription: string;
}

export const AriaSearchResultsAlert = ({ resultCount, resultDescription }: AriaSearchResultsAlertProps) => {
  const intl = useIntl();
  const ariaResultCount = intl.formatMessage({
    defaultMessage: ' results found',
    id: 'b7f44fc00fe2',
    description: 'shows how many results are returned after search',
  });

  // Show alert then hide
  // If we leave the alert rendered, it will reread it on each focus event
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    setShowAlert(true);

    const timeoutId = setTimeout(() => {
      setShowAlert(false);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [resultCount]);

  return showAlert ? (
    <div className={'msla-aria-search-results'} role="alert">{`${resultCount} ${resultDescription} ${ariaResultCount}`}</div>
  ) : null;
};
