import { KnowledgePanelView } from '../../../core/state/knowledge/panelSlice';
import type { RootState } from '../../../core/state/knowledge/store';
import { CreateConnectionPanel } from './connection/create';
import { AddFilePanel } from './addfile';
import { useSelector } from 'react-redux';
import { EditConnectionPanel } from './connection/edit';
import type { UploadFileHandler } from '@microsoft/logic-apps-shared';

export const KnowledgeHubPanel = ({
  resourceId,
  mountNode,
  selectedHub,
  onUploadArtifact,
}: { resourceId: string; mountNode: HTMLDivElement | null; selectedHub?: string; onUploadArtifact?: UploadFileHandler }) => {
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

  if (panelView === KnowledgePanelView.AddFiles && !onUploadArtifact) {
    return null;
  }

  return panelView === KnowledgePanelView.AddFiles ? (
    <AddFilePanel
      resourceId={resourceId}
      mountNode={mountNode}
      selectedHub={selectedHub}
      onUploadArtifact={onUploadArtifact as UploadFileHandler}
    />
  ) : panelView === KnowledgePanelView.CreateConnection ? (
    <CreateConnectionPanel mountNode={mountNode} />
  ) : (
    <EditConnectionPanel mountNode={mountNode} />
  );
};
