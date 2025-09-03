import { Button } from '@fluentui/react-components';
import { getDisplayNameFromConnector, isBuiltInConnectorId } from '@microsoft/logic-apps-shared';
import { FavoriteButton } from '../favoriteButton';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { OperationRuntimeBadges } from '../../../connectorsummarycard/operationRuntimeBadges';
import { useOperationSearchGroupStyles } from './operationSearchGroup.styles';

export interface OperationGroupHeaderNewProps {
  connector: Connector | OperationApi;
  onConnectorClick?: (connectorId: string) => void;
}

export const OperationGroupHeaderNew = ({ connector, onConnectorClick }: OperationGroupHeaderNewProps) => {
  const { id } = connector;
  const connectorName = getDisplayNameFromConnector(connector);
  const isBuiltIn = isBuiltInConnectorId(id);
  const styles = useOperationSearchGroupStyles();

  return (
    <div className={styles.headerDisplay}>
      <Button appearance="transparent" onClick={() => onConnectorClick?.(id)} className={styles.headerTitle}>
        {connectorName}
      </Button>
      <OperationRuntimeBadges isBuiltIn={isBuiltIn} />
      <div className={styles.headerIcons}>
        <FavoriteButton connectorId={id} showFilledFavoriteOnlyOnHover={false} showUnfilledFavoriteOnlyOnHover={false} />
      </div>
    </div>
  );
};
