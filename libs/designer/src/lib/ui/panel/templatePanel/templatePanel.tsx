import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';
import type { CreateWorkflowHandler } from '../../templates';

export interface TemplatePanelProps {
  showCreate: boolean;
  workflowId: string;
  createWorkflow?: CreateWorkflowHandler;
  clearDetailsOnClose?: boolean;
  onClose?: () => void;
}

export const TemplatePanel = (props: TemplatePanelProps) => {
  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);

  if (!isOpen) {
    return null;
  }

  return currentPanelView === TemplatePanelView.QuickView ? <QuickViewPanel {...props} /> : <CreateWorkflowPanel {...props} />;
};
