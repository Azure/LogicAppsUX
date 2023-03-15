import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import HybridNotice from './HybridNotice';
import { OperationGroupHeader } from './operationGroupHeader';
import { MessageBar, MessageBarType, Spinner } from '@fluentui/react';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export interface OperationGroupDetailsPageProps {
  connector: Connector;
  operationActionsData: OperationActionData[];
  onOperationClick: (id: string) => void;
  isLoading: boolean;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { connector, operationActionsData, onOperationClick, isLoading } = props;
  const { id, properties } = connector;
  const { displayName, description, iconUri, externalDocs } = properties;

  const intl = useIntl();

  const { category } = operationActionsData?.[0] ?? {};
  const isHybrid = operationActionsData.findIndex((action) => action.category !== category) !== -1;

  const noOperationsText = intl.formatMessage({
    defaultMessage: 'No operations found',
    description: 'Message to show when no operations are found',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading...',
    description: 'Loading text for spinner',
  });

  return (
    <div className="msla-op-group-detail-page">
      <OperationGroupHeader id={id} title={displayName} description={description} iconUrl={iconUri} docsUrl={externalDocs?.url} />
      {isHybrid ? <HybridNotice /> : null}
      <div className="msla-op-group-item-container">
        {!isLoading && operationActionsData.length === 0 ? (
          <MessageBar messageBarType={MessageBarType.info}>{noOperationsText}</MessageBar>
        ) : null}
        {operationActionsData?.map((op) => (
          <OperationSearchCard key={op.id} operationActionData={op} onClick={onOperationClick} />
        ))}
        {isLoading ? (
          <div style={{ margin: '16px' }}>
            <Spinner label={loadingText} ariaLive="assertive" labelPosition="right" />
          </div>
        ) : null}
      </div>
    </div>
  );
};
