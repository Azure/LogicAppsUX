import { useCallback, useState, useEffect } from 'react';
import { Panel, PanelType } from '@fluentui/react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../';
import { closePanel, McpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useMcpPanelStyles } from './styles';
import type { RootState } from '../../../core/state/mcp/store';
import { ConnectorPanelInner } from './connectorPanel/ConnectorPanel';

export interface McpPanelRootProps {
  panelContainerRef: React.MutableRefObject<HTMLElement | null>;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;

export const McpPanelRoot = ({ panelContainerRef }: McpPanelRootProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  const layerProps = {
    hostId: 'mcp-layer-host',
    eventBubblingEnabled: true,
  };

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

      const rect = panelContainerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const newWidth = rect.right - e.clientX;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
    },
    [isResizing, panelContainerRef]
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        dismissPanel();
      }
    },
    [dismissPanel]
  );

  if (!isOpen || !panelMode) {
    return null;
  }

  return (
    <Panel
      className={`mcp-panel-root-${panelMode}`}
      isLightDismiss
      isBlocking={false}
      type={PanelType.custom}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={false}
      customWidth={`${panelWidth}px`}
      styles={{
        main: {
          backgroundColor: '#ffffff',
          transition: isResizing ? 'none' : 'width 0.2s ease',
        },
        content: {
          padding: 0,
          position: 'relative',
        },
        scrollableContent: {
          height: '100%',
        },
      }}
      layerProps={layerProps}
    >
      <div className={styles.panelContent} onKeyDown={handleKeyDown} tabIndex={-1}>
        {(panelMode === McpPanelView.SelectConnector ||
          panelMode === McpPanelView.SelectOperation ||
          panelMode === McpPanelView.CreateConnection) && <ConnectorPanelInner />}

        {/* {panelMode === McpPanelView.SelectConnector && <ConnectorSelectionPanel onDismiss={dismissPanel} />} */}
        {/* Add other panel modes here as needed */}
      </div>
    </Panel>
  );
};
