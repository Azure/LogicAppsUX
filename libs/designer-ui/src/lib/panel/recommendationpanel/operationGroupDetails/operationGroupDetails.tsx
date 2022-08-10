import HybridNotice from './HybridNotice';
import { OperationGroupHeader } from './operationGroupHeader';
import { OperationGroupAction } from './opertationGroupAction';
import { Link } from '@fluentui/react';
import type { OperationApi } from '@microsoft-logic-apps/utils';

export interface OperationGroupDetailsPageProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onClickOperation: (id: string) => void;
  onClickBack: () => void;
}

export interface OperationActionData {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  category: 'Built-in' | 'Azure' | '';
  connectorName?: string;
  brandColor?: string;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { operationApi, operationActionsData, onClickOperation, onClickBack } = props;
  const { id, displayName, description, iconUri } = operationApi;

  const firstCategory = operationActionsData[0].category;
  const isHybrid = operationActionsData.findIndex((action) => action.category !== firstCategory) !== -1;

  return (
    <div className="msla-op-group-detail-page">
      <Link onClick={onClickBack}>{'< Return to search'}</Link>
      <OperationGroupHeader id={id} title={displayName} description={description} iconUrl={iconUri} />
      {isHybrid ? <HybridNotice /> : null}
      <div className="msla-op-group-item-container">
        {operationActionsData?.map((op) => (
          <OperationGroupAction key={op.id} operationActionData={op} onClick={onClickOperation} />
        ))}
      </div>
    </div>
  );
};
