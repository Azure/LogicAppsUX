import { Text } from '@fluentui/react-components';
import { getDisplayNameFromConnector, isBuiltInConnectorId } from '@microsoft/logic-apps-shared';
import { FavoriteButton } from '../favoriteButton';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { OperationRuntimeBadges } from '../../../connectorsummarycard/operationRuntimeBadges';
import { useOperationSearchGroupStyles } from './operationSearchGroup.styles';

export interface OperationGroupHeaderNewProps {
  connector: Connector | OperationApi;
}

export const OperationGroupHeaderNew = ({ connector }: OperationGroupHeaderNewProps) => {
  const { id } = connector;
  const connectorName = getDisplayNameFromConnector(connector);
  const isBuiltIn = isBuiltInConnectorId(id);
  const styles = useOperationSearchGroupStyles();

  return (
    <div className={styles.headerDisplay}>
      <Text className={styles.headerTitle}>{connectorName}</Text>
      <OperationRuntimeBadges isBuiltIn={isBuiltIn} />
      <div className={styles.headerIcons}>
        <FavoriteButton connectorId={id} showFilledFavoriteOnlyOnHover={false} showUnfilledFavoriteOnlyOnHover={false} />
      </div>
    </div>
  );
};
