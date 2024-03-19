import { AnnouncedMatches } from '../../announcedmatches';
import { useIntl } from 'react-intl';

export const TokenPickerNoMatches = (): JSX.Element => {
  const intl = useIntl();
  const noMatchesText = intl.formatMessage({
    defaultMessage: 'There are no results for your search',
    id: 'L4RJF0',
    description: 'Text for when no tokens match search query',
  });
  const searchTipsHeader = intl.formatMessage({
    defaultMessage: 'Search Tips',
    id: 'YfwZJO',
    description: 'Search tip header label',
  });
  const searchTip1 = intl.formatMessage({
    defaultMessage: 'Ensure words are spelled correctly.',
    id: 'XH94im',
    description: 'Search tip 1',
  });
  const searchTip2 = intl.formatMessage({
    defaultMessage: 'Try less specific keywords.',
    id: 'n7wxxN',
    description: 'Search tip 2',
  });
  return (
    <>
      <div className="msla-token-picker-no-matches">
        <div className="msla-token-picker-no-results">{noMatchesText}</div>
        <hr />
        <div className="msla-token-picker-no-matches-header">{searchTipsHeader}</div>
        <div className="msla-token-picker-no-matches-tip">{searchTip1}</div>
        <div className="msla-token-picker-no-matches-tip">{searchTip2}</div>
      </div>
      <AnnouncedMatches count={0} visible={true} />
    </>
  );
};
