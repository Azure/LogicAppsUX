import { TemplateContent, TemplatesPanelFooter, type McpPanelTabProps } from '@microsoft/designer-ui';
import { useMcpConnectorPanelTabs } from './usePanelTabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './../../../../core/state/mcp/store';
import { selectPanelTab } from './../../../../core/state/mcp/panel/mcpPanelSlice';
import { DrawerBody, DrawerFooter, DrawerHeader } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';

export const ConnectorPanelInner = () => {
  const dispatch = useDispatch<AppDispatch>();
  const panelTabs: McpPanelTabProps[] = useMcpConnectorPanelTabs();
  const { selectedTabId } = useSelector((state: RootState) => ({
    selectedTabId: state.mcpPanel.selectedTabId,
  }));

  const onTabSelected = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  const styles = useMcpPanelStyles();

  return (
    <div>
      <DrawerHeader className={styles.header}>{'header placeholder'}</DrawerHeader>
      <DrawerBody>
        <TemplateContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={onTabSelected} />
      </DrawerBody>
      {selectedTabProps?.footerContent && (
        <DrawerFooter className={styles.footer}>
          DKFJSLKDFJSDLKFj
          <TemplatesPanelFooter {...selectedTabProps.footerContent} />
        </DrawerFooter>
      )}
    </div>
  );
};
