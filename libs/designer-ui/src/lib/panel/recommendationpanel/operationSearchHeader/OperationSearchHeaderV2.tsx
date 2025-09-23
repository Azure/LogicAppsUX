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

  const searchPlaceholderText = intl.formatMessage(
    hideOperations
      ? {
          defaultMessage: 'Search for a connector',
          id: 'CLJuAQ',
          description: 'Placeholder text for Connector search bar',
        }
      : isTriggerNode
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
      </div>
    </div>
  );
};
