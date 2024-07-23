import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox } from '@fluentui/react';
import { Dropdown, Label, Option } from '@fluentui/react-components';
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
    value: category.key,
  }));

  const actionTypeFilters = isTriggerNode
    ? [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', id: 'piaRy6', description: 'Filter by Triggers category of connectors' }),
          value: 'triggers',
        },
      ]
    : [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', id: 'piaRy6', description: 'Filter by Triggers category of connectors' }),
          value: 'triggers',
        },
        {
          key: 'actionType-actions',
          text: intl.formatMessage({ defaultMessage: 'Actions', id: 'bG9rjv', description: 'Filter by Actions category of connectors' }),
          value: 'actions',
        },
      ];

  const groupByConnectorLabelText = intl.formatMessage({
    defaultMessage: 'Group by Connector',
    id: 'U3guPp',
    description: 'Label for the checkbox to group results by connector',
  });

  const onOptionSelect = (
    data: { optionValue: string | undefined; optionText: string | undefined; selectedOptions: string[] },
    filterProperty: string
  ) => {
    if (data.optionValue) {
      const newFilters = { ...filters };
      if (filters?.[filterProperty] === data.optionValue) {
        delete newFilters[filterProperty];
      } else {
        newFilters[filterProperty] = data.optionValue;
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

  const runtimeText = intl.formatMessage({
    defaultMessage: 'Runtime',
    id: 'g5A6Bn',
    description: 'Filter by label',
  });

  const actionTypeText = intl.formatMessage({
    defaultMessage: 'Action Type',
    id: 'TRpSCQ',
    description: 'Filter by label',
  });

  return (
    <div className="msla-sub-heading-container">
      <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} />
      {displayRuntimeInfo || displayActionType ? (
        <div style={{ display: 'grid', grid: 'auto-flow / 1fr 1fr', gridColumnGap: '8px' }}>
          {displayRuntimeInfo && runtimeFilters.length > 0 ? (
            <div style={{ display: 'inherit' }}>
              <Label htmlFor={'runtimeDropdown'}>{runtimeText}</Label>
              <Dropdown
                id={'runtimeDropdown'}
                placeholder={
                  filters?.['runtime']
                    ? runtimeFilters?.find((data) => data.value === filters['runtime'])?.text
                    : intl.formatMessage({
                        defaultMessage: 'Select a runtime',
                        id: 'uc3ytS',
                        description: 'Select a runtime placeholder',
                      })
                }
                onOptionSelect={(_e, data) => onOptionSelect(data, 'runtime')}
                multiselect={true}
                selectedOptions={filters?.['runtime'] ? [filters['runtime']] : []}
              >
                {runtimeFilters.map((item) => (
                  <Option key={item.key} text={item.text} value={item.value}>
                    {item.text}
                  </Option>
                ))}
              </Dropdown>
            </div>
          ) : null}
          {displayActionType ? (
            <div style={{ display: 'inherit' }}>
              <Label htmlFor={'actionTypeDropdown'}>{actionTypeText}</Label>
              <Dropdown
                id={'actionTypeDropdown'}
                placeholder={
                  filters?.['actionType']
                    ? actionTypeFilters?.find((data) => data.value === filters['actionType'])?.text
                    : intl.formatMessage({
                        defaultMessage: 'Select an action type',
                        id: 'lsKVU6',
                        description: 'Select an action type placeholder',
                      })
                }
                onOptionSelect={(_e, data) => onOptionSelect(data, 'actionType')}
                disabled={isTriggerNode}
                multiselect={true}
                selectedOptions={filters?.['actionType'] ? [filters['actionType']] : []}
              >
                {actionTypeFilters.map((item) => (
                  <Option key={item.key} text={item.text} value={item.value}>
                    {item.text}
                  </Option>
                ))}
              </Dropdown>
            </div>
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
