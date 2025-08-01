import { useMemo, useCallback } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, McpPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import {
  initializeOperationsMetadata,
  initializeConnectionMappings,
  deinitializeOperations,
} from '../../../../core/actions/bjsworkflow/mcp';
import { operationsTab } from './tabs/operationsTab';
import { useIntl } from 'react-intl';
import { connectorsTab } from './tabs/connectorsTab';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import { connectionsTab } from './tabs/connectionsTab';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import constants from '../../../../common/constants';
import { clearAllSelections } from '../../../../core/state/mcp/mcpselectionslice';

export const useMcpConnectorPanelTabs = (): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const {
    currentPanelView,
    selectedOperations,
    selectedConnectorId,
    connectionsMapping,
    connectionReferences,
    isInitializingConnections,
    operationInfos,
  } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    selectedConnectorId: state.mcpSelection.selectedConnectorId,
    selectedOperations: state.mcpSelection.selectedOperations ?? [],
    connectionsMapping: state.connection.connectionsMapping,
    connectionReferences: state.connection.connectionReferences,
    isInitializingConnections: state.connection.loading.initializeConnectionMappings,
    operationInfos: state.operations.operationInfo,
  }));

  const hasSelectConnectorTab = useMemo(() => currentPanelView === McpPanelView.SelectConnector, [currentPanelView]);

  const hasValidConnection = useMemo(() => {
    if (!selectedOperations.length) {
      return false;
    }

    return selectedOperations.some((operationId) => {
      const nodeId = operationId;
      const referenceKey = connectionsMapping[nodeId];
      return referenceKey && connectionReferences[referenceKey];
    });
  }, [selectedOperations, connectionsMapping, connectionReferences]);

  const newlySelectedOperationIds = useMemo(() => {
    return selectedOperations.filter((operationId) => !Object.keys(operationInfos).includes(operationId));
  }, [operationInfos, selectedOperations]);

  const deselectedOperationIds = useMemo(() => {
    return Object.keys(operationInfos).filter((operationId) => !selectedOperations.includes(operationId));
  }, [operationInfos, selectedOperations]);

  const handleSubmit = useCallback(() => {
    if (selectedConnectorId && selectedOperations.length > 0) {
      // Deinitializing deselected operations
      if (deselectedOperationIds.length > 0) {
        dispatch(deinitializeOperations({ operationIds: deselectedOperationIds }));
      }

      // Initializing newly selected operations
      if (newlySelectedOperationIds.length > 0) {
        const selectedOperationsData = newlySelectedOperationIds.map((operationId) => ({
          connectorId: selectedConnectorId,
          operationId: getResourceNameFromId(operationId),
          type: 'apiconnection' as const,
        }));
        dispatch(initializeOperationsMetadata({ operations: selectedOperationsData }));
      } else {
        dispatch(closePanel());
        dispatch(clearAllSelections());
      }
    }
  }, [dispatch, selectedConnectorId, selectedOperations, newlySelectedOperationIds, deselectedOperationIds]);

  const handleOnSelectOperations = useCallback(async () => {
    // This triggers the loading state and initializes connections
    await dispatch(
      initializeConnectionMappings({
        connectorId: selectedConnectorId as string,
        operations: selectedOperations,
      })
    );
  }, [dispatch, selectedConnectorId, selectedOperations]);

  const connectorsTabItem = useMemo(
    () =>
      connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: !selectedConnectorId,
      }),
    [intl, dispatch, selectedConnectorId]
  );

  const operationsTabItem = useMemo(
    () =>
      operationsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
        selectedOperationsCount: selectedOperations.length,
        onSelectOperations: handleOnSelectOperations,
        isPrimaryButtonLoading: isInitializingConnections,
        previousTabId: hasSelectConnectorTab ? constants.MCP_PANEL_TAB_NAMES.CONNECTORS : undefined,
      }),
    [intl, dispatch, selectedOperations.length, handleOnSelectOperations, isInitializingConnections, hasSelectConnectorTab]
  );

  const connectionsTabItem = useMemo(
    () =>
      connectionsTab(intl, dispatch, selectedConnectorId as string, selectedOperations, {
        isTabDisabled: isInitializingConnections,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: !selectedConnectorId || selectedOperations.length === 0 || !hasValidConnection,
        onAddConnector: handleSubmit,
      }),
    [intl, dispatch, selectedConnectorId, selectedOperations, hasValidConnection, handleSubmit, isInitializingConnections]
  );

  const tabs: McpPanelTabProps[] = useMemo(() => {
    const validTabs = [];
    if (hasSelectConnectorTab) {
      validTabs.push(connectorsTabItem);
    }
    if (currentPanelView !== McpPanelView.CreateConnection) {
      validTabs.push(operationsTabItem);
    }
    validTabs.push(connectionsTabItem);
    return validTabs;
  }, [currentPanelView, hasSelectConnectorTab, connectorsTabItem, operationsTabItem, connectionsTabItem]);

  return tabs;
};
