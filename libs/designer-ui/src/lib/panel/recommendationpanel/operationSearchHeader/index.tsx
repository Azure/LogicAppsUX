/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable react/jsx-no-literals */
import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox, Icon, IconButton, Link, Text } from '@fluentui/react';
import type { IDropdownStyles, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react/lib/Dropdown';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const dropdownStyles: Partial<IDropdownStyles> = { dropdown: { width: 300 } };

interface OperationSearchHeaderProps {
  onSearch: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  isGrouped?: boolean;
  searchTerm?: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  selectedGroupId?: string;
  onDismiss: () => void;
  navigateBack: () => void;
}

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const { onSearch, onGroupToggleChange, isGrouped = false, searchTerm, selectedGroupId, onDismiss, navigateBack } = props;

  const intl = useIntl();

  const DropdownControlledMultiExampleOptions = [
    {
      key: 'runtime',
      text: intl.formatMessage({
        defaultMessage: 'Runtime',
        description: 'Filter by runtime header',
      }),
      itemType: DropdownMenuItemType.Header,
    },
    {
      key: 'runtime-inapp',
      text: intl.formatMessage({ defaultMessage: 'In-App', description: 'Filter by In App category of connectors' }),
    },
    {
      key: 'runtime-shared',
      text: intl.formatMessage({ defaultMessage: 'Shared', description: 'Filter by Shared category of connectors' }),
    },
  ];
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

  const returnToBrowseText = intl.formatMessage({
    defaultMessage: 'Return to browse',
    description: 'Text for the Search Operations page navigation heading',
  });

  const returnToSearchText = intl.formatMessage({
    defaultMessage: 'Return to search',
    description: 'Text for the Details page navigation heading',
  });

  const Navigation = useCallback(() => {
    return (
      <div className="msla-flex-row">
        {searchTerm || selectedGroupId ? (
          <Link onClick={navigateBack} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon iconName="Back" />
            {!selectedGroupId || !searchTerm ? returnToBrowseText : returnToSearchText}
          </Link>
        ) : (
          <Text variant="xLarge">{browseNavText}</Text>
        )}
        <IconButton onClick={onDismiss} iconProps={{ iconName: 'Cancel' }} />
      </div>
    );
  }, [browseNavText, navigateBack, onDismiss, returnToBrowseText, returnToSearchText, searchTerm, selectedGroupId]);

  const onChange = (event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    if (item) {
      const [k, v] = (item.key as string).split('-');
      if (item.selected) {
        props.setFilters?.({ ...props.filters, [k]: v });
      } else {
        const newFilters = { ...props.filters };
        delete newFilters[k];
        props.setFilters?.(newFilters);
      }
    }
  };

  return (
    <div className="msla-search-heading-container">
      <Navigation />
      {!selectedGroupId ? (
        <>
          <DesignerSearchBox onSearch={onSearch} />
          <Dropdown
            placeholder={intl.formatMessage({ defaultMessage: 'Select a filter', description: 'Select a filter placeholder' })}
            label={intl.formatMessage({ defaultMessage: 'Filter', description: 'Filter by label' })}
            selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
            onChange={onChange}
            multiSelect
            options={DropdownControlledMultiExampleOptions}
            styles={dropdownStyles}
          />
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
