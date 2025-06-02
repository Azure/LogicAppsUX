import { MessageBar, MessageBarType } from '@fluentui/react';
import { BrowseGrid } from '../browseResults';
import type { OperationActionData } from '../interfaces';
import HybridNotice from './HybridNotice';
import { isNullOrUndefined, type Connector } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { OperationGroupHeaderNew } from '../operationSearchGroup/operationGroupHeader';

export interface OperationGroupDetailsPageProps {
  connector?: Connector;
  operationActionsData: OperationActionData[];
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  addAsConnector?: (connector: Connector, operations: OperationActionData[]) => void;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { connector, operationActionsData, onOperationClick, isLoading } = props;
  const intl = useIntl();

  const { category } = operationActionsData?.[0] ?? {};
  const isHybrid = operationActionsData.some((action) => action.category !== category);
  const isLoadingConnector = isNullOrUndefined(connector);

  const noOperationsText = intl.formatMessage({
    defaultMessage: 'No operations found',
    id: 'Sr8PcK',
    description: 'Message to show when no operations are found',
  });

  const noOperationsContainer =
    !isLoading && operationActionsData.length === 0 ? (
      <MessageBar messageBarType={MessageBarType.info}>{noOperationsText}</MessageBar>
    ) : null;

  return (
    <div className="msla-op-group-detail-page">
      {isLoadingConnector ? null : (
        <>
          <OperationGroupHeaderNew connector={connector} />
          {noOperationsContainer}
          {isHybrid ? <HybridNotice /> : null}
          <BrowseGrid
            isLoading={isLoading}
            operationsData={operationActionsData}
            onOperationSelected={onOperationClick}
            hideNoResultsText={true}
            displayRuntimeInfo={false}
          />
        </>
      )}
    </div>
  );
};
