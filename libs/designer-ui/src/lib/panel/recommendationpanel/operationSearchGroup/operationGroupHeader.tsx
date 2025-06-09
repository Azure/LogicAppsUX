import { Text } from '@fluentui/react-components';
import { getDisplayNameFromConnector, isBuiltInConnectorId } from '@microsoft/logic-apps-shared';
import { FavoriteButton } from '../favoriteButton';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { OperationRuntimeBadges } from '../../../connectorsummarycard/operationRuntimeBadges';

export interface OperationGroupHeaderNewProps {
  connector: Connector | OperationApi;
}

export const OperationGroupHeaderNew = ({ connector }: OperationGroupHeaderNewProps) => {
  const { id } = connector;
  const connectorName = getDisplayNameFromConnector(connector);
  const isBuiltIn = isBuiltInConnectorId(id);

  return (
    <div className="msla-recommendation-panel-operation-search-group-header-display">
      <Text className="msla-recommendation-panel-operation-search-group-header-title">{connectorName}</Text>
      <OperationRuntimeBadges isBuiltIn={isBuiltIn} />
      <div className="msla-recommendation-panel-operation-search-group-header-icons">
        <FavoriteButton connectorId={id} showFilledFavoriteOnlyOnHover={false} showUnfilledFavoriteOnlyOnHover={false} />
      </div>
    </div>
  );
};
