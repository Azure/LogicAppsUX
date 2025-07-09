import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from '../connectors/connectorSelectionStyles';
import type { RootState } from '../../../core/state/mcp/store';

export const SelectOperations = () => {
  const styles = useConnectorSelectionStyles();
  const { data: allConnectors } = useAllConnectors();

  const { selectedNodeId: selectedConnectorId } = useSelector((state: RootState) => state.mcpPanel);
  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div>Details view for connector: {selectedConnector?.properties?.displayName}</div>
      </div>
    </div>
  );
};
