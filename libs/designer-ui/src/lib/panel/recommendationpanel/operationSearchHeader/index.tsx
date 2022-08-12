import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox, IconButton, Link } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  onSearch: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  isGrouped?: boolean;
  searchTerm: string;
  onDismiss: () => void;
}

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const { onSearch, onGroupToggleChange, isGrouped = false, searchTerm, onDismiss } = props;

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

  return (
    <div className="msla-search-heading-container">
      <div className="msla-flex-row">
        {searchTerm ? <Link onClick={() => onSearch('')}>{'< Return to browse'}</Link> : <strong>{'Browse Operations'}</strong>}
        <IconButton onClick={onDismiss} iconProps={{ iconName: 'Cancel' }} />
      </div>
      <DesignerSearchBox onSearch={onSearch} />
      {searchTerm ? (
        <div className="msla-flex-row">
          <span className="msla-search-heading-text">{searchResultsText}</span>
          <Checkbox label={groupByConnectorLabelText} onChange={onGroupToggleChange} checked={isGrouped} />
        </div>
      ) : null}
      {/* TODO: riley - show the filter and sort options */}
    </div>
  );
};
