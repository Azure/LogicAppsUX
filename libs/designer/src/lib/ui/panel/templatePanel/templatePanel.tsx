import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel } from './quickViewPanel/quickViewPanel';
import { type TemplatePanelTab, TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useCreateWorkflowPanelTabs } from './createWorkflowPanel/usePanelTabs';
import { useQuickViewPanelTabs } from './quickViewPanel/usePanelTabs';

export const TemplatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);

  const dismissPanel = useCallback(() => dispatch(closePanel()), [dispatch]);

  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs(onCreateClick);
  const quickViewPanelTabs = useQuickViewPanelTabs();

  const currentPanelTabs: TemplatePanelTab[] = useMemo(() => {
    return currentPanelView === 'createWorkflow' ? createWorkflowPanelTabs : currentPanelView === 'quickView' ? quickViewPanelTabs : [];
  }, [currentPanelView, createWorkflowPanelTabs, quickViewPanelTabs]);

  const onRenderFooterContent = useCallback(() => {
    const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];

    if (!selectedTabProps?.footerContent) {
      return <></>;
    }

    return <TemplatesPanelFooter {...selectedTabProps?.footerContent} />;
  }, [selectedTabId, currentPanelTabs]);

  return (
    <Panel
      isLightDismiss
      type={PanelType.medium}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={true}
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
