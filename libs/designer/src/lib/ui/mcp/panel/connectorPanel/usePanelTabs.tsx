import { useMemo } from 'react';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { McpPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { operationsTab } from './tabs/operationsTab';
import { useIntl } from 'react-intl';
import { connectorsTab } from './tabs/connectorsTab';

export const usePanelTabs = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { currentPanelView } = useSelector((state: RootState) => state.mcpPanel);

  const connectorsTabItem = useMemo(
    () => ({
      ...connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
      }),
    }),
    [intl, dispatch]
  );

  const operationsTabItem = useMemo(
    () => ({
      ...operationsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
      }),
    }),
    [intl, dispatch]
  );

  const connectionsTabItem = useMemo(
    () => ({
      ...connectorsTab(intl, dispatch, {
        isTabDisabled: false,
        isPreviousButtonDisabled: false,
        isPrimaryButtonDisabled: false,
        onAddConnector: () => {
          //TODO
        },
      }),
    }),
    [intl, dispatch]
  );

  const tabs = useMemo(() => {
    const validTabs = [];
    if (currentPanelView === McpPanelView.SelectConnector) {
      validTabs.push(connectorsTabItem);
    }
    if (currentPanelView !== McpPanelView.CreateConnection) {
      validTabs.push(operationsTabItem);
    }
    validTabs.push(connectionsTabItem);
  }, [currentPanelView, connectorsTabItem, operationsTabItem, connectionsTabItem]);
  return tabs;
};
