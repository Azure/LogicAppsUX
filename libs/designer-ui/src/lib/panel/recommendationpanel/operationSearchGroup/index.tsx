import { ConnectorSummaryCard } from '../../../connectorsummarycard';
import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import type { OperationApi } from '@microsoft-logic-apps/utils';
import { isBuiltInConnector } from '@microsoft-logic-apps/utils';

export interface OperationSearchGroupProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onClickOperation: (id: string) => void;
}

export const OperationSearchGroup = (props: OperationSearchGroupProps) => {
  const { operationApi, operationActionsData, onClickOperation } = props;
  const { id, displayName, description, iconUri } = operationApi;

  const category = isBuiltInConnector(id) ? 'Built-in' : 'Azure';

  return (
    <div>
      <ConnectorSummaryCard
        id={id}
        connectorName={displayName}
        description={description}
        iconUrl={iconUri}
        category={category}
        isCard={false}
      />
      <div className="msla-op-search-group">
        {operationActionsData?.map((op) => (
          <OperationSearchCard key={op?.id} operationActionData={op} onClick={onClickOperation} />
        ))}
      </div>
    </div>
  );
};
