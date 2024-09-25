import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel, CreateWorkflowPanelHeader } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel, QuickViewPanelHeader } from './quickViewPanel/quickViewPanel';
import { type TemplatePanelTab, TemplatesPanelFooter } from '@microsoft/designer-ui';
import { useCreateWorkflowPanelTabs } from './createWorkflowPanel/usePanelTabs';
import { clearTemplateDetails } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import { getQuickViewTabs } from '../../../core/templates/utils/helper';
import { useExistingWorkflowNames } from '../../../core/queries/template';

export const TemplatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const { templateName, workflowAppName } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
  }));
  const manifest = useSelector((state: RootState) => state.template?.manifest);
  const templateTitle = manifest?.title ?? '';
  const templateDescription = manifest?.description ?? '';
  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
    dispatch(clearTemplateDetails());
  }, [dispatch]);
  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs({
    onCreateClick,
  });
  const currentPanelTabs: TemplatePanelTab[] = useMemo(
    () =>
      currentPanelView === 'createWorkflow'
        ? createWorkflowPanelTabs
        : getQuickViewTabs(intl, dispatch, {
            templateId: templateName ?? 'Unknown',
            workflowAppName,
          }),
    [currentPanelView, createWorkflowPanelTabs, intl, dispatch, templateName, workflowAppName]
  );

  const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];
  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const onRenderHeaderContent = useCallback(
    () =>
      currentPanelView === 'quickView' ? (
        <QuickViewPanelHeader title={templateTitle} description={templateDescription} details={manifest?.details ?? {}} />
      ) : (
        <CreateWorkflowPanelHeader title={templateTitle} description={templateDescription} />
      ),
    [currentPanelView, templateTitle, templateDescription, manifest?.details]
  );
  const onRenderFooterContent = useCallback(
    () => (selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null),
    [selectedTabProps]
  );
  const { refetch: refetchWorkflowNames } = useExistingWorkflowNames();
  useEffect(() => {
    if (isOpen && currentPanelView === 'createWorkflow') {
      refetchWorkflowNames();
    }
  }, [isOpen, currentPanelView, refetchWorkflowNames]);

  return (
    <Panel
      styles={{ main: { padding: '0 20px' }, content: { paddingLeft: '0px' } }}
      isLightDismiss
      type={PanelType.medium}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={true}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      {currentPanelView === 'createWorkflow' ? (
        <CreateWorkflowPanel panelTabs={createWorkflowPanelTabs} />
      ) : currentPanelView === 'quickView' ? (
        <QuickViewPanel />
      ) : null}
    </Panel>
  );
};
