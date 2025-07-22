import { useSelector } from 'react-redux';
import { McpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import type { RootState } from '../../../core/state/mcp/store';
import { SelectionPanel } from './connector/SelectionPanel';
import { EditOperationPanel } from './operation/EditOperationPanel';

export const McpPanelRoot = () => {
  const { isOpen, panelMode } = useSelector((state: RootState) => ({
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelMode: state.mcpPanel?.currentPanelView ?? null,
  }));

  if (!isOpen || !panelMode) {
    return null;
  }

  return (
    <>
      {(panelMode === McpPanelView.SelectConnector ||
        panelMode === McpPanelView.SelectOperation ||
        panelMode === McpPanelView.CreateConnection) && <SelectionPanel />}
      {panelMode === McpPanelView.EditOperation && <EditOperationPanel />}
    </>
  );
};
