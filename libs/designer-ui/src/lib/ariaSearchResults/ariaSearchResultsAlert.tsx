import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useAriaSearchResultsStyles } from './styles';

interface AriaSearchResultsAlertProps {
  resultCount: number;
  resultDescription: string;
}

export const AriaSearchResultsAlert = ({ resultCount, resultDescription }: AriaSearchResultsAlertProps) => {
  const intl = useIntl();
  const classes = useAriaSearchResultsStyles();
  const ariaResultCount = intl.formatMessage({
    defaultMessage: ' results found',
    id: 't/RPwA',
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

  return showAlert ? <div className={classes.root} role="alert">{`${resultCount} ${resultDescription} ${ariaResultCount}`}</div> : null;
};
