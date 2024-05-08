import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';

export const TemplatePanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);

  const dismissPanel = useCallback(() => dispatch(closePanel()), [dispatch]);

  return (
    <Panel isLightDismiss type={PanelType.medium} isOpen={isOpen} onDismiss={dismissPanel} hasCloseButton={true}>
      {currentPanelView === 'createWorkflow' ? <CreateWorkflowPanel /> : currentPanelView === 'quickView' ? <QuickViewPanel /> : undefined}
    </Panel>
  );
};
