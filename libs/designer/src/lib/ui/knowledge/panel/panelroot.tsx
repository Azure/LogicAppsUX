import { KnowledgePanelView } from '../../../core/state/knowledge/panelSlice';
import type { RootState } from '../../../core/state/knowledge/store';
import { CreateOrUpdateConnectionPanel } from './connection/create';
import { AddFilePanel } from './addfile';
import { useSelector } from 'react-redux';

export const KnowledgeHubPanel = ({ resourceId }: { resourceId: string }) => {
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
    <AddFilePanel resourceId={resourceId} />
  ) : (
    <CreateOrUpdateConnectionPanel isCreate={panelView === KnowledgePanelView.CreateConnection} />
  );
};
