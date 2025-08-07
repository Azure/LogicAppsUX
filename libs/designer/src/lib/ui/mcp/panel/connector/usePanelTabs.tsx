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
  const isUpdateOperationsView = useMemo(() => currentPanelView === McpPanelView.UpdateOperation, [currentPanelView]);
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

  const handleSubmit = useCallback(
    (submitLocation: string) => {
      if (selectedConnectorId && selectedOperations.length > 0) {
        // Deinitializing deselected operations
        if (deselectedOperationIds.length > 0) {
          dispatch(deinitializeOperations({ operationIds: deselectedOperationIds }));
        }

        LoggerService().log({
          level: LogEntryLevel.Trace,
          area: `MCP.${submitLocation}`,
          message: 'Operations, and connections metadata are updated',
          args: [
            `connectorId:${selectedConnectorId}`,
            `operationIds:${selectedOperations.join(',')}`,
            `newlySelectedOperationIds:${newlySelectedOperationIds.join(',')}`,
            `deselectedOperationIds:${deselectedOperationIds.join(',')}`,
          ],
        });

        // Initializing newly selected operations
        if (newlySelectedOperationIds.length > 0) {
          const selectedOperationsData = newlySelectedOperationIds.map((operationId) => ({
            connectorId: selectedConnectorId,
            operationId: getResourceNameFromId(operationId),
            type: 'apiconnection' as const,
          }));
          dispatch(initializeOperationsMetadata({ operations: selectedOperationsData, area: submitLocation }));
        } else {
          dispatch(closePanel());
          dispatch(clearAllSelections());
        }
      }
    },
    [dispatch, selectedConnectorId, selectedOperations, newlySelectedOperationIds, deselectedOperationIds]
  );

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
  const onConnectionsTabNavigation = useCallback(
    (navigationLocation: string) => {
      // This triggers the loading state and initializes connections
      dispatch(
        initializeConnectionMappings({
          connectorId: selectedConnectorId as string,
          operations: selectedOperations,
          area: navigationLocation,
        })
      );

      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: `MCP.${navigationLocation}`,
        message: 'Connector operations are selected',
        args: [`operationIds:${selectedOperations.join(',')}`, `connectorId:${selectedConnectorId}`],
      });
    },
    [dispatch, selectedConnectorId, selectedOperations]
  );

  const operationTabPrimaryButtonTitle = useMemo(() => {
    if (isUpdateOperationsView) {
      return intl.formatMessage({
        defaultMessage: 'Save',
        id: 'Qvk1rO',
        description: 'Button text for updating action selections',
      });
    }

    return selectedOperations.length > 0
      ? intl.formatMessage(
          {
            defaultMessage: 'Next ({count} selected)',
            id: 'ti2c1D',
            description: 'Button text for moving to the next tab with action count',
          },
          { count: selectedOperations.length }
        )
      : intl.formatMessage({
          defaultMessage: 'Next',
          id: 'ZWnmOv',
          description: 'Button text for moving to the next tab in the connector panel',
        });
  }, [intl, isUpdateOperationsView, selectedOperations.length]);

  const operationsTabItem = useMemo(
    () =>
      operationsTab(intl, dispatch, {
        isTabDisabled: isOperationsTabDisabled,
        primaryButtonTitle: operationTabPrimaryButtonTitle,
        isPrimaryButtonDisabled: isConnectionsTabDisabled,
        onPrimaryButtonClick: isUpdateOperationsView
          ? () => handleSubmit('AddActions')
          : () => onConnectionsTabNavigation(hasSelectConnectorTab ? 'AddConnector' : 'EditConnector'),
        isPrimaryButtonLoading: isInitializingConnections,
        previousTabId: hasSelectConnectorTab ? constants.MCP_PANEL_TAB_NAMES.CONNECTORS : undefined,
        tabStatusIcon: operationsError ? 'error' : undefined,
      }),
    [
      intl,
      dispatch,
      isOperationsTabDisabled,
      operationTabPrimaryButtonTitle,
      isConnectionsTabDisabled,
      isUpdateOperationsView,
      handleSubmit,
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
        onTabClick: () => onConnectionsTabNavigation(hasSelectConnectorTab ? 'AddConnector' : 'EditConnector'),
        isPrimaryButtonDisabled: !selectedConnectorId || selectedOperations.length === 0 || !hasValidConnection,
        onPrimaryButtonClick: () => handleSubmit(hasSelectConnectorTab ? 'AddConnector' : 'EditConnector'),
      }),
    [
      intl,
      dispatch,
      selectedConnectorId,
      selectedOperations,
      hasValidConnection,
      handleSubmit,
      onConnectionsTabNavigation,
      hasSelectConnectorTab,
      isConnectionsTabDisabled,
    ]
  );

  const tabs: McpPanelTabProps[] = useMemo(() => {
    const validTabs = [];
    if (hasSelectConnectorTab) {
      validTabs.push(connectorsTabItem);
    }
    // TODO: double check this logix
    if (currentPanelView !== McpPanelView.SelectOperation && currentPanelView !== McpPanelView.CreateConnection) {
      validTabs.push(operationsTabItem);
    }
    if (currentPanelView !== McpPanelView.UpdateOperation) {
      validTabs.push(connectionsTabItem);
    }
    return validTabs;
  }, [currentPanelView, hasSelectConnectorTab, connectorsTabItem, operationsTabItem, connectionsTabItem]);

  return tabs;
};
