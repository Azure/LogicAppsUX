import { TemplateContent, TemplatesPanelFooter, type McpPanelTabProps } from '@microsoft/designer-ui';
import { useMcpConnectorPanelTabs } from './usePanelTabs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './../../../../core/state/mcp/store';
import { closePanel, selectPanelTab } from './../../../../core/state/mcp/panel/mcpPanelSlice';
import { Button, DrawerBody, DrawerFooter, DrawerHeader, Text } from '@fluentui/react-components';
import { useMcpPanelStyles } from '../styles';
import { useIntl } from 'react-intl';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback } from 'react';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ConnectorPanelInner = () => {
  const intl = useIntl();
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

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'SH50TJ',
      defaultMessage: 'Add Connectors',
      description: 'Title for connector selection panel',
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
    <div>
      <DrawerHeader className={styles.header}>
        <div className={styles.headerContent}>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {selectedTabProps?.title ?? INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </DrawerHeader>
      <DrawerBody>
        <TemplateContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={onTabSelected} />
      </DrawerBody>
      {selectedTabProps?.footerContent && (
        <DrawerFooter className={styles.footer}>
          <TemplatesPanelFooter {...selectedTabProps.footerContent} />
        </DrawerFooter>
      )}
    </div>
  );
};
