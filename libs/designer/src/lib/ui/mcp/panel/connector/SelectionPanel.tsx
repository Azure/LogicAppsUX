import { TemplateContent, TemplatesPanelFooter, type McpPanelTabProps } from '@microsoft/designer-ui';
import { useMcpConnectorPanelTabs } from './usePanelTabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel, McpPanelView, selectPanelTab } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback } from 'react';
import { clearAllSelections } from '../../../../core/state/mcp/mcpselectionslice';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const SelectionPanel = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const panelTabs: McpPanelTabProps[] = useMcpConnectorPanelTabs();
  const { selectedTabId, isOpen, panelMode } = useSelector((state: RootState) => ({
    selectedTabId: state.mcpPanel.selectedTabId,
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  const onTabSelected = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

  const styles = useMcpPanelStyles();

  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Add actions',
      id: 'wUvEwM',
      description: 'The tab label for the selection panel on the connector panel',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  const handleDismiss = useCallback(() => {
    dispatch(clearAllSelections());
    dispatch(closePanel());
  }, [dispatch]);

  return (
    <Drawer
      className={styles.drawer}
      open={
        isOpen &&
        (panelMode === McpPanelView.SelectConnector ||
          panelMode === McpPanelView.SelectOperation ||
          panelMode === McpPanelView.UpdateOperation ||
          panelMode === McpPanelView.CreateConnection)
      }
      onOpenChange={(_, { open }) => !open && handleDismiss()}
      position="end"
      size="large"
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {panelMode === McpPanelView.SelectConnector
              ? 'Add connector'
              : panelMode === McpPanelView.SelectOperation
                ? 'Edit connection'
                : INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <TemplateContent
          tabs={panelTabs}
          selectedTab={selectedTabId}
          selectTab={onTabSelected}
          containerClassName={'msla-templates-panel-mcp'}
        />
      </DrawerBody>
      {selectedTabProps?.footerContent && (
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...selectedTabProps.footerContent} />
        </DrawerFooter>
      )}
    </Drawer>
  );
};
