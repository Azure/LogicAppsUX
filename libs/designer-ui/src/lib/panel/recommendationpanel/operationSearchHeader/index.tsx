import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import type { OperationRuntimeCategory } from '@microsoft/logic-apps-shared';
import { LogEntryLevel, LoggerService, SearchService } from '@microsoft/logic-apps-shared';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  searchCallback: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  displayRuntimeInfo: boolean;
  displayActionType?: boolean;
  isGrouped?: boolean;
  searchTerm?: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  isTriggerNode: boolean;
}

const getDefaultRuntimeCategories = (intl: IntlShape): OperationRuntimeCategory[] => {
  return [
    {
      key: 'inapp',
      text: intl.formatMessage({ defaultMessage: 'In-App', id: 'p1Qtm5', description: 'Filter by In App category of connectors' }),
    },
    {
      key: 'shared',
      text: intl.formatMessage({ defaultMessage: 'Shared', id: '00xlpa', description: 'Filter by Shared category of connectors' }),
    },
    {
      key: 'custom',
      text: intl.formatMessage({ defaultMessage: 'Custom', id: 'byTBrn', description: 'Filter by Custom category of connectors' }),
    },
  ];
};

export const OperationSearchHeader = (props: OperationSearchHeaderProps) => {
  const {
    searchCallback,
    onGroupToggleChange,
    isGrouped = false,
    searchTerm,
    filters,
    setFilters,
    isTriggerNode,
    displayRuntimeInfo,
    displayActionType,
  } = props;

  const intl = useIntl();

  const runtimeFilters = (SearchService().getRuntimeCategories?.() ?? getDefaultRuntimeCategories(intl)).map((category) => ({
    key: `runtime-${category.key}`,
    text: category.text,
  }));

  const actionTypeFilters = isTriggerNode
    ? [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', id: 'piaRy6', description: 'Filter by Triggers category of connectors' }),
        },
      ]
    : [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', id: 'piaRy6', description: 'Filter by Triggers category of connectors' }),
        },
        {
          key: 'actionType-actions',
          text: intl.formatMessage({ defaultMessage: 'Actions', id: 'bG9rjv', description: 'Filter by Actions category of connectors' }),
        },
      ];

  const groupByConnectorLabelText = intl.formatMessage({
    defaultMessage: 'Group by Connector',
    id: 'U3guPp',
    description: 'Label for the checkbox to group results by connector',
  });

  const onChange = (_event: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    if (item) {
      const [k, v] = (item.key as string).split('-');
      let newFilters: Record<string, string>;
      if (item.selected) {
        newFilters = { ...filters, [k]: v };
      } else {
        newFilters = { ...filters };
        delete newFilters[k];
      }
      setFilters?.(newFilters);
      LoggerService().log({
        area: 'OperationSearchHeader:onChange',
        args: [newFilters],
        level: LogEntryLevel.Verbose,
        message: 'Search filters updated.',
      });
    }
  };

  return (
    <div className="msla-sub-heading-container">
      <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} />
      {displayRuntimeInfo || displayActionType ? (
        <div style={{ display: 'grid', grid: 'auto-flow / 1fr 1fr', gridColumnGap: '8px' }}>
          {displayRuntimeInfo && runtimeFilters.length > 0 ? (
            <Dropdown
              label={intl.formatMessage({ defaultMessage: 'Runtime', id: 'g5A6Bn', description: 'Filter by label' })}
              placeholder={intl.formatMessage({
                defaultMessage: 'Select a runtime',
                id: 'uc3ytS',
                description: 'Select a runtime placeholder',
              })}
              selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
              onChange={onChange}
              multiSelect
              options={runtimeFilters}
            />
          ) : null}
          {displayActionType ? (
            <Dropdown
              label={intl.formatMessage({ defaultMessage: 'Action Type', id: 'TRpSCQ', description: 'Filter by label' })}
              placeholder={intl.formatMessage({
                defaultMessage: 'Select an action type',
                id: 'lsKVU6',
                description: 'Select an action type placeholder',
              })}
              selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
              onChange={onChange}
              multiSelect
              options={actionTypeFilters}
              disabled={isTriggerNode}
            />
          ) : null}
        </div>
      ) : null}
      {searchTerm ? (
        <div className="msla-flex-row">
          <Checkbox label={groupByConnectorLabelText} onChange={onGroupToggleChange} checked={isGrouped} />
        </div>
      ) : null}
    </div>
  );
};
