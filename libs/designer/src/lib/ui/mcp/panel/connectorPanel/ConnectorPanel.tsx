import { TemplateContent, type McpPanelTabProps } from '@microsoft/designer-ui';
import { useMcpConnectorPanelTabs } from './usePanelTabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './../../../../core/state/mcp/store';
import { selectPanelTab } from './../../../../core/state/mcp/panel/mcpPanelSlice';

export const ConnectorPanelInner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const panelTabs: McpPanelTabProps[] = useMcpConnectorPanelTabs();
  const { selectedTabId } = useSelector((state: RootState) => ({
    selectedTabId: state.mcpPanel.selectedTabId,
  }));
  //   const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  const onTabSelected = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  return (
    <TemplateContent
      // className={styles.quickviewTabs}
      tabs={panelTabs}
      selectedTab={selectedTabId}
      selectTab={onTabSelected}
    />
  );
};
