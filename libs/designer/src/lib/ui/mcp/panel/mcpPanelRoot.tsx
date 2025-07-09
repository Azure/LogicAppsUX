import { useCallback, useState, useRef, useEffect } from 'react';
import { Panel, PanelType } from '@fluentui/react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../';
import { closePanel, McpPanelView, openPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { ConnectorSelectionPanel } from './ConnectorSelectionPanel';
import { OperationSelectionPanel } from './OperationSelectionPanel';
import { useMcpPanelStyles } from './styles';
import type { RootState } from '../../../core/state/mcp/store';

const MIN_WIDTH = 300;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;

export const McpPanelRoot = () => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useMcpPanelStyles();
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

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

  const handleConnectorSelect = useCallback(
    (connectorId: string) => {
      dispatch(
        openPanelView({
          panelView: McpPanelView.SelectOperation,
          selectedConnectorId: connectorId,
        })
      );
    },
    [dispatch]
  );

  const handleBackToBrowse = useCallback(() => {
    dispatch(
      openPanelView({
        panelView: McpPanelView.SelectConnector,
        selectedConnectorId: undefined,
      })
    );
  }, [dispatch]);

  const handleOperationSelect = useCallback((operationId: string) => {
    // TODO: Handle operation selection
    console.log('Operation selected:', operationId);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        dismissPanel();
      }
    },
    [dismissPanel]
  );

  const renderPanelContent = () => {
    switch (panelMode) {
      case McpPanelView.SelectConnector:
        return <ConnectorSelectionPanel onDismiss={dismissPanel} onConnectorSelect={handleConnectorSelect} />;
      case McpPanelView.SelectOperation:
        return <OperationSelectionPanel onDismiss={dismissPanel} onBack={handleBackToBrowse} onOperationSelect={handleOperationSelect} />;
      default:
        return null;
    }
  };

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
          height: '100%',
        },
        scrollableContent: {
          height: '100%',
        },
      }}
      layerProps={layerProps}
    >
      <div className={styles.panelContent} onKeyDown={handleKeyDown} tabIndex={-1}>
        <div
          ref={resizeRef}
          className={styles.resizeHandle}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-label="Resize panel"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              const delta = e.key === 'ArrowLeft' ? -20 : 20;
              const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, panelWidth + delta));
              setPanelWidth(newWidth);
            }
          }}
        />
        {renderPanelContent()}
      </div>
    </Panel>
  );
};
