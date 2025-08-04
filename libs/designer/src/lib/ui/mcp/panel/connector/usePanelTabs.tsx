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
import { getResourceNameFromId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
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
    operationsError,
  } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    selectedConnectorId: state.mcpSelection.selectedConnectorId,
    selectedOperations: state.mcpSelection.selectedOperations ?? [],
    connectionsMapping: state.connection.connectionsMapping,
    connectionReferences: state.connection.connectionReferences,
    isInitializingConnections: state.connection.loading.initializeConnectionMappings,
    operationInfos: state.operations.operationInfo,
    operationsError: state.mcpSelection.errors.operations,
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

      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'MCP.connectionsTab',
        message: 'Connectors, operations, and connections data are initialized',
        args: [`connectorId:${selectedConnectorId}`, `operationIds:${selectedOperations.join(',')}`],
      });

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

  const isOperationsTabDisabled = useMemo(() => !selectedConnectorId, [selectedConnectorId]);

  const connectorsTabItem = useMemo(
    () =>
      connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: isOperationsTabDisabled,
      }),
    [intl, dispatch, isOperationsTabDisabled]
  );

  const isConnectionsTabDisabled = useMemo(
    () => selectedOperations.length === 0 || isInitializingConnections,
    [selectedOperations, isInitializingConnections]
  );
  const onConnectionsTabNavigation = useCallback(() => {
    // This triggers the loading state and initializes connections
    dispatch(
      initializeConnectionMappings({
        connectorId: selectedConnectorId as string,
        operations: selectedOperations,
      })
    );

    LoggerService().log({
      level: LogEntryLevel.Trace,
      area: 'MCP.operationsTab',
      message: 'Operations are selected',
      args: [`operationIds:${selectedOperations.join(',')}`],
    });
  }, [dispatch, selectedConnectorId, selectedOperations]);

  const operationsTabItem = useMemo(
    () =>
      operationsTab(intl, dispatch, {
        isTabDisabled: isOperationsTabDisabled,
        selectedOperationsCount: selectedOperations.length,
        isPrimaryButtonDisabled: isConnectionsTabDisabled,
        onPrimaryButtonClick: onConnectionsTabNavigation,
        isPrimaryButtonLoading: isInitializingConnections,
        previousTabId: hasSelectConnectorTab ? constants.MCP_PANEL_TAB_NAMES.CONNECTORS : undefined,
        tabStatusIcon: operationsError ? 'error' : undefined,
      }),
    [
      intl,
      dispatch,
      isOperationsTabDisabled,
      selectedOperations.length,
      isConnectionsTabDisabled,
      onConnectionsTabNavigation,
      isInitializingConnections,
      hasSelectConnectorTab,
      operationsError,
    ]
  );

  const connectionsTabItem = useMemo(
    () =>
      connectionsTab(intl, dispatch, selectedConnectorId as string, selectedOperations, {
        isTabDisabled: isConnectionsTabDisabled,
        onTabClick: onConnectionsTabNavigation,
        isPrimaryButtonDisabled: !selectedConnectorId || selectedOperations.length === 0 || !hasValidConnection,
        onPrimaryButtonClick: handleSubmit,
      }),
    [
      intl,
      dispatch,
      selectedConnectorId,
      selectedOperations,
      hasValidConnection,
      handleSubmit,
      onConnectionsTabNavigation,
      isConnectionsTabDisabled,
    ]
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
