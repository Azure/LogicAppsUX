import { useMemo } from 'react';
import type { RootState } from '../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { MCP_ConnectionKey } from '../../../core/actions/bjsworkflow/mcp';

export const useValidMcpConnection = () => {
  const { references, connectionsMapping, operations, disableConnectorSelection, connectorId } = useSelector((state: RootState) => ({
    references: state.connection.connectionReferences,
    connectionsMapping: state.connection.connectionsMapping,
    operations: Object.values(state.operations.operationInfo),
    disableConnectorSelection: state.mcpSelection.disableConnectorSelection,
    connectorId: state.mcpSelection.selectedConnectorId,
  }));

  const hasValidConnection = useMemo(() => {
    if (operations.length === 0 && disableConnectorSelection && connectorId) {
      const referenceKey = connectionsMapping[MCP_ConnectionKey];
      const reference = referenceKey ? references[referenceKey] : null;

      return !!reference;
    }

    return operations.every((operation) => {
      const referenceKey = connectionsMapping[operation.operationId];
      const reference = referenceKey ? references[referenceKey] : null;

      return !!reference;
    });
  }, [connectionsMapping, connectorId, disableConnectorSelection, operations, references]);

  return hasValidConnection;
};
