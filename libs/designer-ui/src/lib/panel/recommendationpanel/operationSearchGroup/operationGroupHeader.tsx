import { Text } from '@fluentui/react-components';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { getDisplayNameFromConnector } from '@microsoft/logic-apps-shared';
import { FavoriteButton } from '../favoriteButton';

export interface OperationGroupHeaderNewProps {
  connector: Connector | OperationApi;
}

export const OperationGroupHeaderNew = (props: OperationGroupHeaderNewProps) => {
  const { connector } = props;
  const { id } = connector;

  const connectorName = getDisplayNameFromConnector(connector);

  return (
    <div className="msla-recommendation-panel-operation-search-group-header-display">
      <Text className="msla-recommendation-panel-operation-search-group-header-title">{connectorName}</Text>
      <div className="msla-recommendation-panel-operation-search-group-header-icons">
        <FavoriteButton connectorId={id} showFilledFavoriteOnlyOnHover={false} showUnfilledFavoriteOnlyOnHover={false} />
      </div>
    </div>
  );
};
