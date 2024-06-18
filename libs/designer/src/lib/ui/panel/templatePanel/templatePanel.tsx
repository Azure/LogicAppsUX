import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';
import { type TemplatePanelTab, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCreateWorkflowPanelTabs } from './createWorkflowPanel/usePanelTabs';
import { useQuickViewPanelTabs } from './quickViewPanel/usePanelTabs';

export const TemplatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const templateTitle = useSelector((state: RootState) => state.template?.manifest?.title) ?? '';
  const templateDescription = useSelector((state: RootState) => state.template?.manifest?.description) ?? '';
  const dismissPanel = useCallback(() => dispatch(closePanel()), [dispatch]);
  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs(onCreateClick);
  const quickViewPanelTabs = useQuickViewPanelTabs();

  const currentPanelTabs: TemplatePanelTab[] = useMemo(
    () => (currentPanelView === 'createWorkflow' ? createWorkflowPanelTabs : currentPanelView === 'quickView' ? quickViewPanelTabs : []),
    [currentPanelView, createWorkflowPanelTabs, quickViewPanelTabs]
  );

  const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader
        title={currentPanelView === 'createWorkflow' ? 'Create a new workflow' : templateTitle}
        description={currentPanelView === 'createWorkflow' ? templateDescription : 'By Microsoft'}
      />
    ),
    [templateTitle, templateDescription, currentPanelView]
  );
  const onRenderFooterContent = useCallback(
    () => (selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null),
    [selectedTabProps]
  );

  return (
    <Panel
      isLightDismiss
      type={PanelType.medium}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={true}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
    >
      {currentPanelView === 'createWorkflow' ? (
        <CreateWorkflowPanel panelTabs={createWorkflowPanelTabs} />
      ) : currentPanelView === 'quickView' ? (
        <QuickViewPanel panelTabs={quickViewPanelTabs} />
      ) : null}
    </Panel>
  );
};
