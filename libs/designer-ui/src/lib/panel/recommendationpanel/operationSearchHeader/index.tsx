/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable react/jsx-no-literals */
import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox, Icon, IconButton, Link, Text } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react/lib/Dropdown';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  searchCallback: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  isGrouped?: boolean;
  searchTerm?: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  onDismiss: () => void;
  isTriggerNode: boolean;
  isConsumption?: boolean;
}

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const {
    searchCallback,
    onGroupToggleChange,
    isGrouped = false,
    searchTerm,
    filters,
    setFilters,
    onDismiss,
    isTriggerNode,
    isConsumption,
  } = props;

  const intl = useIntl();

  const runtimeFilters = [
    {
      key: 'runtime-inapp',
      text: intl.formatMessage({ defaultMessage: 'In-App', description: 'Filter by In App category of connectors' }),
    },
    {
      key: 'runtime-shared',
      text: intl.formatMessage({ defaultMessage: 'Shared', description: 'Filter by Shared category of connectors' }),
    },
  ];

  if (isConsumption) {
    runtimeFilters.push({
      key: 'runtime-custom',
      text: intl.formatMessage({ defaultMessage: 'Custom', description: 'Filter by Custom category of connectors' }),
    });
  }

  const actionTypeFilters = isTriggerNode
    ? []
    : [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', description: 'Filter by Triggers category of connectors' }),
        },
        {
          key: 'actionType-actions',
          text: intl.formatMessage({ defaultMessage: 'Actions', description: 'Filter by Actions category of connectors' }),
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

  const headingText = intl.formatMessage({
    defaultMessage: 'Add an action',
    description: 'Text for the "Add Action" page header',
  });

  const Header = useCallback(() => {
    return (
      <div className="msla-flex-row" style={{ marginBottom: '8px' }}>
        <Text variant="xLarge">{headingText}</Text>
        <IconButton onClick={onDismiss} iconProps={{ iconName: 'Cancel' }} />
      </div>
    );
  }, [headingText, onDismiss]);

  const onChange = (_event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    if (item) {
      const [k, v] = (item.key as string).split('-');
      if (item.selected) {
        setFilters?.({ ...filters, [k]: v });
      } else {
        const newFilters = { ...filters };
        delete newFilters[k];
        setFilters?.(newFilters);
      }
    }
  };

  return (
    <div className="msla-search-heading-container">
      <Header />
      <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} />
      <div style={{ display: 'grid', grid: 'auto-flow / 1fr 1fr', gridColumnGap: '8px' }}>
        <Dropdown
          label={intl.formatMessage({ defaultMessage: 'Runtime', description: 'Filter by label' })}
          placeholder={intl.formatMessage({ defaultMessage: 'Select a runtime', description: 'Select a runtime placeholder' })}
          selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
          onChange={onChange}
          multiSelect
          options={runtimeFilters}
        />
        <Dropdown
          label={intl.formatMessage({ defaultMessage: 'Action Type', description: 'Filter by label' })}
          placeholder={intl.formatMessage({
            defaultMessage: 'Select an action type',
            description: 'Select an action type placeholder',
          })}
          selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
          onChange={onChange}
          multiSelect
          options={actionTypeFilters}
        />
      </div>
      {searchTerm ? (
        <div className="msla-flex-row">
          {/* <span className="msla-search-heading-text">{searchResultsText}</span> */}
          <Checkbox label={groupByConnectorLabelText} onChange={onGroupToggleChange} checked={isGrouped} />
        </div>
      ) : null}
    </div>
  );
};
