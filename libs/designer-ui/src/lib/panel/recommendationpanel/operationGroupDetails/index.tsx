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
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  displayRuntimeInfo: boolean;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { connector, operationActionsData, onOperationClick, isLoading, displayRuntimeInfo } = props;
  const { id, properties } = connector;
  const { displayName, description, iconUri, externalDocs, generalInformation } = properties;

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
      <OperationGroupHeader
        id={id}
        title={displayName}
        description={description ?? generalInformation?.description}
        iconUrl={iconUri}
        docsUrl={externalDocs?.url}
      />
      {isHybrid ? <HybridNotice /> : null}
      <ul className="msla-op-group-item-container">
        {!isLoading && operationActionsData.length === 0 ? (
          <MessageBar messageBarType={MessageBarType.info}>{noOperationsText}</MessageBar>
        ) : null}
        {operationActionsData?.map((op) => (
          <li key={op.id}>
            <OperationSearchCard operationActionData={op} onClick={onOperationClick} displayRuntimeInfo={displayRuntimeInfo} />
          </li>
        ))}
        {isLoading ? (
          <div style={{ margin: '16px 0' }}>
            <Spinner label={loadingText} ariaLive="assertive" labelPosition="right" />
          </div>
        ) : null}
      </ul>
    </div>
  );
};
