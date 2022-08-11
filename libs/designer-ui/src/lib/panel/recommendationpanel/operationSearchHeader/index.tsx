import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  onSearch: any;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  isGrouped?: boolean;
  searchTerm: string;
}

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const { onSearch, onGroupToggleChange, isGrouped = false, searchTerm } = props;

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
