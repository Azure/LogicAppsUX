import { TemplateContent, TemplatesPanelFooter, type McpPanelTabProps } from '@microsoft/designer-ui';
import { useCreateAppPanelTabs } from './usepaneltabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { closePanel, McpPanelView, selectPanelTab } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { clearNewLogicAppDetails } from '../../../../core/state/mcp/resourceSlice';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const CreateAppPanel = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const panelTabs: McpPanelTabProps[] = useCreateAppPanelTabs();
  const { selectedTabId, isOpen, panelMode } = useSelector((state: RootState) => ({
    selectedTabId: state.mcpPanel.selectedTabId,
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  const onTabSelected = useCallback(
    (tabId: string): void => {
      dispatch(selectPanelTab(tabId));
    },
    [dispatch]
  );

  const selectedTabProps = useMemo(
    () => (selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0]),
    [selectedTabId, panelTabs]
  );
  const styles = useMcpPanelStyles();
  const INTL_TEXT = {
    title: intl.formatMessage({
      defaultMessage: 'Create a logic app resource',
      id: 'Fh8wYp',
      description: 'Header for the panel to create a logic app resource',
    }),
    subtitle: intl.formatMessage({
      defaultMessage: 'Logic App Standard',
      id: 'TyXFz0',
      description: 'Subtitle for the panel to create a logic app resource',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  const handleDismiss = useCallback(() => {
    dispatch(clearNewLogicAppDetails());
    dispatch(closePanel());
  }, [dispatch]);

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && panelMode === McpPanelView.CreateLogicApp}
      onOpenChange={(_, { open }) => !open && handleDismiss()}
      position="end"
      size="large"
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
        <Text size={200} className={styles.headerSubtitle}>
          {INTL_TEXT.subtitle}
        </Text>
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
