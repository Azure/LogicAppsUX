// Updated useMcpConnectorPanelTabs hook
import { useMemo, useCallback } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { McpPanelView, closePanel } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { initializeOperationsMetadata } from '../../../../core/actions/bjsworkflow/mcp';
import { operationsTab } from './tabs/operationsTab';
import { useIntl } from 'react-intl';
import { connectorsTab } from './tabs/connectorsTab';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import { connectionsTab } from './tabs/connectionsTab';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';

export const useMcpConnectorPanelTabs = (): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { currentPanelView, selectedOperations, selectedConnectorId } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    selectedConnectorId: state.connector.selectedConnectorId,
    selectedOperations: state.connector.selectedOperations ?? [],
  }));

  const handleSubmit = useCallback(() => {
    if (selectedConnectorId && selectedOperations.length > 0) {
      const operations = selectedOperations.map((operationId) => ({
        connectorId: selectedConnectorId,
        operationId: getResourceNameFromId(operationId),
        type: 'apiconnection' as const, // Assuming all are API connections for now
      }));

      dispatch(initializeOperationsMetadata({ operations }));

      dispatch(closePanel());
    }
  }, [dispatch, selectedConnectorId, selectedOperations]);

  const connectorsTabItem = useMemo(
    () =>
      connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
      }),
    [intl, dispatch]
  );

  const operationsTabItem = useMemo(
    () =>
      operationsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
        selectedOperationsCount: selectedOperations.length,
      }),
    [intl, dispatch, selectedOperations.length]
  );

  const connectionsTabItem = useMemo(
    () =>
      connectionsTab(intl, dispatch, selectedConnectorId as string, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        // Disable the primary button if no connector or operations are selected
        isPrimaryButtonDisabled: !selectedConnectorId || selectedOperations.length === 0,
        onAddConnector: handleSubmit,
      }),
    [intl, dispatch, selectedConnectorId, selectedOperations.length, handleSubmit]
  );

  const tabs: McpPanelTabProps[] = useMemo(() => {
    const validTabs = [];
    if (currentPanelView === McpPanelView.SelectConnector) {
      validTabs.push(connectorsTabItem);
    }
    if (currentPanelView !== McpPanelView.CreateConnection) {
      validTabs.push(operationsTabItem);
    }
    validTabs.push(connectionsTabItem);
    return validTabs;
  }, [currentPanelView, connectorsTabItem, operationsTabItem, connectionsTabItem]);

  return tabs;
};
