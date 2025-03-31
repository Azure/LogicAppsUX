import { useIntl } from 'react-intl';
import { bundleIcon, Search48Filled, Search48Regular } from '@fluentui/react-icons';
import { Button } from '@fluentui/react-components';

const SearchVisual = bundleIcon(Search48Filled, Search48Regular);

export const NoAgentParameters = ({ usingSearch, clearSearch }: { usingSearch: boolean; clearSearch: () => void }) => {
  const intl = useIntl();

  const noAgentParametersTitle = intl.formatMessage({
    defaultMessage: 'No agent parameters to display',
    id: 'tjzxSa',
    description: 'Title for no agent parameters found',
  });

  const searchPlaceHolderText = intl.formatMessage({
    defaultMessage: 'No agent parameters match your search filter',
    id: 'ZuvTLD',
    description: 'Title for no agent parameters found to match search',
  });

  const createMoreMessage = intl.formatMessage({
    defaultMessage: 'Use the button below to create a new agent parameter',
    id: 'JBiI6s',
    description: 'Message displayed to create more agent parameters',
  });

  const clearSearchButtonLabel = intl.formatMessage({
    defaultMessage: 'Clear search',
    id: 'zhMe58',
    description: 'Label for clear search button',
  });

  return (
    <div className="msla-token-picker-agent-parameter-no-results">
      <SearchVisual className="msla-token-picker-agent-parameter-no-results-icon" />
      <span className="msla-token-picker-agent-parameter-no-results-title">
        {usingSearch ? searchPlaceHolderText : noAgentParametersTitle}
      </span>
      {usingSearch ? (
        <Button appearance="secondary" onClick={clearSearch} className="msla-token-picker-agent-parameter-no-results-clear-search">
          {clearSearchButtonLabel}
        </Button>
      ) : null}
      <span>{createMoreMessage}</span>
    </div>
  );
};
