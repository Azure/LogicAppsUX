import { useCallback, useMemo } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { McpPanelView, selectPanelTab } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { operationsTab } from './tabs/operationsTab';
import { useIntl } from 'react-intl';
import { connectorsTab } from './tabs/connectorsTab';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import { connectionsTab } from './tabs/connectionsTab';
import constants from '../../../../common/constants';
import { initializeConnectionMappings } from '../../../../core/actions/bjsworkflow/mcp';

export const useMcpConnectorPanelTabs = (): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { currentPanelView, selectedOperations, selectedConnectorId } = useSelector((state: RootState) => ({
    currentPanelView: state.mcpPanel.currentPanelView,
    selectedConnectorId: state.mcpPanel.selectedConnectorId,
    selectedOperations: state.mcpPanel.selectedOperations ?? [],
  }));

  const handleOnSelectOperations = useCallback(() => {
    dispatch(initializeConnectionMappings({ connectorId: selectedConnectorId as string, operations: selectedOperations }));
    dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.CONNECTIONS));
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
        onSelectOperations: handleOnSelectOperations,
      }),
    [intl, dispatch, selectedOperations.length, handleOnSelectOperations]
  );

  const connectionsTabItem = useMemo(
    () =>
      connectionsTab(intl, dispatch, selectedConnectorId as string, selectedOperations, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
        onAddConnector: () => {
          //TODO
        },
      }),
    [intl, dispatch, selectedConnectorId, selectedOperations]
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
