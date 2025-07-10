import { useMemo } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { McpPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { useOperationsTab } from './tabs/operationsTab'; // Changed import
import { useIntl } from 'react-intl';
import { connectorsTab } from './tabs/connectorsTab';
import type { McpPanelTabProps } from '@microsoft/designer-ui';
import { connectionsTab } from './tabs/connectionsTab';

export const useMcpConnectorPanelTabs = (): McpPanelTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { currentPanelView } = useSelector((state: RootState) => state.mcpPanel);

  const connectorsTabItem = useMemo(
    () =>
      connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
      }),
    [intl, dispatch]
  );

  const operationsTabItem = useOperationsTab(intl, dispatch, {
    isTabDisabled: false,
    isPreviousButtonDisabled: false,
    isPrimaryButtonDisabled: false,
  });

  const connectionsTabItem = useMemo(
    () =>
      connectionsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
        onAddConnector: () => {
          //TODO
        },
      }),
    [intl, dispatch]
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
