import { KnowledgePanelView } from '../../../core/state/knowledge/panelSlice';
import type { RootState } from '../../../core/state/knowledge/store';
import { CreateConnectionPanel } from './connection/create';
import { AddFilePanel } from './addfile';
import { useSelector } from 'react-redux';
import { EditConnectionPanel } from './connection/edit';

export const KnowledgeHubPanel = ({ resourceId, mountNode }: { resourceId: string; mountNode: HTMLDivElement | null }) => {
  const { isOpen, panelView } = useSelector((state: RootState) => ({
    isOpen: state.knowledgeHubPanel?.isOpen ?? false,
    panelView: state.knowledgeHubPanel?.currentPanelView,
  }));

  if (
    !isOpen ||
    (panelView !== KnowledgePanelView.CreateConnection &&
      panelView !== KnowledgePanelView.EditConnection &&
      panelView !== KnowledgePanelView.AddFiles)
  ) {
    return null;
  }

  return panelView === KnowledgePanelView.AddFiles ? (
    <AddFilePanel resourceId={resourceId} mountNode={mountNode} />
  ) : panelView === KnowledgePanelView.CreateConnection ? (
    <CreateConnectionPanel mountNode={mountNode} />
  ) : (
    <EditConnectionPanel mountNode={mountNode} />
  );
};
