import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox, Icon, IconButton, Link, Text } from '@fluentui/react';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  onSearch: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  isGrouped?: boolean;
  searchTerm?: string;
  selectedGroupId?: string;
  onDismiss: () => void;
  navigateBack: () => void;
}

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const { onSearch, onGroupToggleChange, isGrouped = false, searchTerm, selectedGroupId, onDismiss, navigateBack } = props;

  const intl = useIntl();

  const searchResultsText = intl.formatMessage(
    {
      defaultMessage: 'Search results for: {searchTerm}',
      description: 'Text to show the current search term',
    },
    {
      searchTerm: <strong>{`"${searchTerm}"`}</strong>,
    }
  );

  const groupByConnectorLabelText = intl.formatMessage({
    defaultMessage: 'Group by Connector',
    description: 'Label for the checkbox to group results by connector',
  });

  const browseNavText = intl.formatMessage({
    defaultMessage: 'Browse Operations',
    description: 'Text for the Browse Operations page navigation heading',
  });

  const searchNavText = intl.formatMessage({
    defaultMessage: 'Return to browse',
    description: 'Text for the Search Operations page navigation heading',
  });

  const detailsNavText = intl.formatMessage({
    defaultMessage: 'Return to search',
    description: 'Text for the Details page navigation heading',
  });

  const Navigation = useCallback(() => {
    return (
      <div className="msla-flex-row">
        {searchTerm || selectedGroupId ? (
          <Link onClick={navigateBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Back" />
            {selectedGroupId ? detailsNavText : searchNavText}
          </Link>
        ) : (
          <Text variant="xLarge">{browseNavText}</Text>
        )}
        <IconButton onClick={onDismiss} iconProps={{ iconName: 'Cancel' }} />
      </div>
    );
  }, [browseNavText, detailsNavText, navigateBack, onDismiss, searchNavText, searchTerm, selectedGroupId]);

  return (
    <div className="msla-search-heading-container">
      <Navigation />
      {!selectedGroupId ? (
        <>
          <DesignerSearchBox onSearch={onSearch} />
          {searchTerm ? (
            <div className="msla-flex-row">
              <span className="msla-search-heading-text">{searchResultsText}</span>
              <Checkbox label={groupByConnectorLabelText} onChange={onGroupToggleChange} checked={isGrouped} />
            </div>
          ) : null}
          {/* TODO: riley - show the filter and sort options */}
        </>
      ) : null}
    </div>
  );
};
