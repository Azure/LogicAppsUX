import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../';
import { closePanel, McpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useMcpPanelStyles } from './styles';
import type { RootState } from '../../../core/state/mcp/store';
import { SelectionPanel } from './connector/SelectionPanel';
import { Drawer } from '@fluentui/react-components';
import { EditOperationPanelInner } from './operation/EditOperationPanelInner';

export const McpPanelRoot = () => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();

  const { isOpen, panelMode } = useSelector((state: RootState) => ({
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  if (!isOpen || !panelMode) {
    return null;
  }

  return (
    <Drawer className={styles.drawer} open={isOpen} onOpenChange={(_, { open }) => !open && dismissPanel()} position="end" size="large" >
      {(panelMode === McpPanelView.SelectConnector ||
        panelMode === McpPanelView.SelectOperation ||
        panelMode === McpPanelView.CreateConnection) && <SelectionPanel />}
      {panelMode === McpPanelView.EditOperation && <EditOperationPanelInner />}
    </Drawer>
  );
};
