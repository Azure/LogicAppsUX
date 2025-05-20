import { DesignerSearchBox } from '../../../searchbox';
import { useIntl } from 'react-intl';
import { OperationTypeFilter } from '../operationTypeFilter';

interface OperationSearchHeaderProps {
  searchCallback: (s: string) => void;
  searchTerm?: string;
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  isTriggerNode: boolean;
}

export const OperationSearchHeader = ({ searchCallback, searchTerm, filters, setFilters, isTriggerNode }: OperationSearchHeaderProps) => {
  const intl = useIntl();

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

  const searchPlaceholderText = intl.formatMessage(
    isTriggerNode
      ? {
          defaultMessage: 'Search for a trigger or connector',
          id: 'CLJuAQ',
          description: 'Placeholder text for Trigger/Connector search bar',
        }
      : {
          defaultMessage: 'Search for an action or connector',
          id: 'py9dSW',
          description: 'Placeholder text for Operation/Connector search bar',
        }
  );

  return (
    <div className="msla-sub-heading-container">
      <div className="msla-sub-heading">
        <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} placeholder={searchPlaceholderText} />
        <OperationTypeFilter actionTypeFilters={actionTypeFilters} filters={filters} disabled={isTriggerNode} setFilters={setFilters} />
      </div>
    </div>
  );
};
