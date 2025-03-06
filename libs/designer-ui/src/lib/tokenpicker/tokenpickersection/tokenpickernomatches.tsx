import { AnnouncedMatches } from '../../announcedmatches';
import { useIntl } from 'react-intl';

export const TokenPickerNoMatches = (): JSX.Element => {
  const intl = useIntl();
  const noMatchesText = intl.formatMessage({
    defaultMessage: 'There are no results for your search',
    id: '2f8449174a7e',
    description: 'Text for when no tokens match search query',
  });
  const searchTipsHeader = intl.formatMessage({
    defaultMessage: 'Search tips',
    id: 'f4ecc39c9718',
    description: 'Search tip header label',
  });
  const searchTip1 = intl.formatMessage({
    defaultMessage: 'Ensure words are spelled correctly.',
    id: '5c7f788a6b73',
    description: 'Search tip 1',
  });
  const searchTip2 = intl.formatMessage({
    defaultMessage: 'Try less specific keywords.',
    id: '9fbc31c4dcbc',
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
