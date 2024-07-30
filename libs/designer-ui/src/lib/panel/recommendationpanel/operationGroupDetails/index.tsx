import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import HybridNotice from './HybridNotice';
import { OperationGroupHeader } from './operationGroupHeader';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import type { Connector } from '@microsoft/logic-apps-shared';
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
    id: 'Sr8PcK',
    description: 'Message to show when no operations are found',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading...',
    id: '5ytHcK',
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
      <ul className="msla-op-group-item-container" aria-description={`Operation list for ${displayName} Connector`}>
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
            <Spinner size="tiny" label={loadingText} aria-live="assertive" />
          </div>
        ) : null}
      </ul>
    </div>
  );
};
