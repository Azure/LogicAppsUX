import { DesignerSearchBox } from '../../../searchbox';
import { useIntl } from 'react-intl';

interface OperationSearchHeaderProps {
  searchCallback: (s: string) => void;
  searchTerm?: string;
  isTriggerNode: boolean;
  hideOperations?: boolean;
}

export const OperationSearchHeaderV2 = ({ searchCallback, searchTerm, isTriggerNode, hideOperations }: OperationSearchHeaderProps) => {
  const intl = useIntl();

  const connectorSearchPlaceholder = intl.formatMessage({
    defaultMessage: 'Search for a connector',
    id: 'tw6oMS',
    description: 'Placeholder text for Connector search bar',
  });

  const triggerSearchPlaceholder = intl.formatMessage({
    defaultMessage: 'Search for a trigger',
    id: 'TiUE/i',
    description: 'Placeholder text for Trigger search bar',
  });

  const actionSearchPlaceholder = intl.formatMessage({
    defaultMessage: 'Search for an action',
    id: 'Tzq5ot',
    description: 'Placeholder text for Action search bar',
  });

  const searchPlaceholderText = hideOperations
    ? connectorSearchPlaceholder
    : isTriggerNode
      ? triggerSearchPlaceholder
      : actionSearchPlaceholder;

  return (
    <div className="msla-sub-heading-container">
      <div className="msla-sub-heading">
        <DesignerSearchBox searchCallback={searchCallback} searchTerm={searchTerm} placeholder={searchPlaceholderText} />
      </div>
    </div>
  );
};
