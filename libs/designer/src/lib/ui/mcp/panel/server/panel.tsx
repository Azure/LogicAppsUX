import { McpPanelView } from '../../../../core/state/mcp/panel/mcpPanelSlice';
import type { RootState } from '../../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import type { McpServer } from '@microsoft/logic-apps-shared';
import { GenerateKeys } from './generatekeys';
import { CreateServer } from './create';

export const McpServerPanel = ({
  onUpdateServer,
  server,
  onClose,
}: {
  onUpdateServer: (servers: Partial<McpServer>) => Promise<void>;
  server?: McpServer;
  onClose: () => void;
}) => {
  const { isOpen, panelView } = useSelector((state: RootState) => ({
    isOpen: state.mcpPanel?.isOpen ?? false,
    panelView: state.mcpPanel?.currentPanelView,
  }));

  if (
    !isOpen ||
    (panelView !== McpPanelView.CreateMcpServer && panelView !== McpPanelView.EditMcpServer && panelView !== McpPanelView.GenerateKeys)
  ) {
    return null;
  }

  return panelView === McpPanelView.GenerateKeys ? (
    <GenerateKeys />
  ) : panelView === McpPanelView.CreateMcpServer ? (
    <CreateServer onUpdate={onUpdateServer} onClose={onClose} />
  ) : server !== undefined ? (
    <CreateServer onUpdate={onUpdateServer} server={server} onClose={onClose} />
  ) : null;
};
