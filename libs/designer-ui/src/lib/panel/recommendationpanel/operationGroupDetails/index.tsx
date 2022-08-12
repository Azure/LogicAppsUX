import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import HybridNotice from './HybridNotice';
import { OperationGroupHeader } from './operationGroupHeader';
import type { OperationApi } from '@microsoft-logic-apps/utils';

export interface OperationGroupDetailsPageProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onOperationClick: (id: string) => void;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { operationApi, operationActionsData, onOperationClick } = props;
  const { id, displayName, description, iconUri, externalDocs } = operationApi;

  const firstCategory = operationActionsData[0].category;
  const isHybrid = operationActionsData.findIndex((action) => action.category !== firstCategory) !== -1;

  return (
    <div className="msla-op-group-detail-page">
      <OperationGroupHeader id={id} title={displayName} description={description} iconUrl={iconUri} docsUrl={externalDocs?.url} />
      {isHybrid ? <HybridNotice /> : null}
      <div className="msla-op-group-item-container">
        {operationActionsData?.map((op) => (
          <OperationSearchCard key={op.id} operationActionData={op} onClick={onOperationClick} />
        ))}
      </div>
    </div>
  );
};
