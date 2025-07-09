import { useCallback, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../';
import { closePanel, McpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useMcpPanelStyles } from './styles';
import type { RootState } from '../../../core/state/mcp/store';
import { ConnectorPanelInner } from './connectorPanel/ConnectorPanelInner';
import { Drawer } from '@fluentui/react-components';
import { EditOperationPanelInner } from './editOperationPanel/EditOperationPanelInner';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;

export const McpPanelRoot = () => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const { isOpen, panelMode } = useSelector((state: RootState) => ({
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }

      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!isOpen || !panelMode) {
    return null;
  }

  return (
    <Drawer
      className={styles.drawer}
      open={isOpen}
      onOpenChange={(_, { open }) => !open && dismissPanel()}
      position="end"
      style={{ width: panelWidth }}
    >
      {(panelMode === McpPanelView.SelectConnector ||
        panelMode === McpPanelView.SelectOperation ||
        panelMode === McpPanelView.CreateConnection) && <ConnectorPanelInner />}
      {panelMode === McpPanelView.EditOperation && <EditOperationPanelInner />}
    </Drawer>
  );
};
