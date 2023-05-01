import { DesignerSearchBox } from '../../../searchbox';
import { Checkbox } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  searchCallback: (s: string) => void;
  onGroupToggleChange: (ev?: React.FormEvent<HTMLElement | HTMLInputElement> | undefined, checked?: boolean | undefined) => void;
  displayRuntimeInfo: boolean;
  isGrouped?: boolean;
  searchTerm?: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  isTriggerNode: boolean;
}

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
    {
      key: 'runtime-custom',
      text: intl.formatMessage({ defaultMessage: 'Custom', description: 'Filter by Custom category of connectors' }),
    },
  ];

  const actionTypeFilters = isTriggerNode
    ? [
        {
          key: 'actionType-triggers',
          text: intl.formatMessage({ defaultMessage: 'Triggers', description: 'Filter by Triggers category of connectors' }),
        },
      ]
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

  const groupByConnectorLabelText = intl.formatMessage({
    defaultMessage: 'Group by Connector',
    description: 'Label for the checkbox to group results by connector',
  });

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
    <div className="msla-sub-heading-container">
      <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} />
      <div style={{ display: 'grid', grid: 'auto-flow / 1fr 1fr', gridColumnGap: '8px' }}>
        {displayRuntimeInfo ? (
          <Dropdown
            label={intl.formatMessage({ defaultMessage: 'Runtime', description: 'Filter by label' })}
            placeholder={intl.formatMessage({ defaultMessage: 'Select a runtime', description: 'Select a runtime placeholder' })}
            selectedKeys={Object.entries(props.filters ?? {}).map(([k, v]) => `${k}-${v}`)}
            onChange={onChange}
            multiSelect
            options={runtimeFilters}
          />
        ) : null}
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
          disabled={isTriggerNode}
        />
      </div>
      {searchTerm ? (
        <div className="msla-flex-row">
          <Checkbox label={groupByConnectorLabelText} onChange={onGroupToggleChange} checked={isGrouped} />
        </div>
      ) : null}
    </div>
  );
};
