import { TemplateContent, TemplatesPanelFooter, type KnowledgeTabProps } from '@microsoft/designer-ui';
import { useCreateConnectionPanelTabs } from './usepaneltabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/knowledge/store';
import { closePanel, KnowledgePanelView, selectPanelTab } from '../../../../core/state/knowledge/panelSlice';
import { Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { usePanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const CreateConnectionPanel = ({ mountNode }: { mountNode: HTMLDivElement | null }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const panelTabs: KnowledgeTabProps[] = useCreateConnectionPanelTabs();
  const { selectedTabId, isOpen, panelMode } = useSelector((state: RootState) => ({
    selectedTabId: state.knowledgeHubPanel.selectedTabId,
    isOpen: state.knowledgeHubPanel?.isOpen ?? false,
    panelMode: state.knowledgeHubPanel?.currentPanelView ?? null,
  }));
  const isConnectionsPanel = useMemo(
    () => panelMode === KnowledgePanelView.CreateConnection || panelMode === KnowledgePanelView.EditConnection,
    [panelMode]
  );

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
  const styles = usePanelStyles();
  const INTL_TEXT = {
    createTitle: intl.formatMessage({
      defaultMessage: 'Set up connection',
      id: 'PAnD/E',
      description: 'Header for the panel to create a knowledge hub connection',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen && isConnectionsPanel}
      onOpenChange={(_, { open }) => !open && handleDismiss()}
      position="end"
      size="large"
      mountNode={{ element: mountNode }}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.createTitle}
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
