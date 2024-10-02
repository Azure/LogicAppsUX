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
import type { CreateWorkflowHandler } from '../../templates';

export interface TemplatePanelProps {
  showCreate: boolean;
  workflowId?: string;
  createWorkflow?: CreateWorkflowHandler;
  onClose?: () => void;
}

export const TemplatePanel = ({ createWorkflow, onClose, showCreate, workflowId }: TemplatePanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const { templateName, workflowAppName, manifest, workflows } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
    manifest: state.template.manifest,
    workflows: state.template.workflows,
  }));
  const isMultiWorkflowTemplate = useMemo(() => Object.keys(workflows).length > 1, [workflows]);
  const templateTitle = manifest?.title ?? '';
  const templateDescription = manifest?.description ?? '';

  const resources = {
    multiWorkflowCreateTitle: intl.formatMessage({
      defaultMessage: 'Create workflows from template',
      id: '5pSOjg',
      description: 'Panel header title for creating workflows',
    }),
  };

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());

    if (showCreate) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [dispatch, onClose, showCreate]);

  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs({
    isMultiWorkflowTemplate,
    createWorkflow: createWorkflow ?? (() => Promise.resolve()),
  });
  const currentPanelTabs: TemplatePanelTab[] = useMemo(
    () =>
      currentPanelView === 'createWorkflow'
        ? createWorkflowPanelTabs
        : getQuickViewTabs(intl, dispatch, showCreate, {
            templateId: templateName ?? 'Unknown',
            workflowAppName,
          }),
    [currentPanelView, createWorkflowPanelTabs, intl, dispatch, showCreate, templateName, workflowAppName]
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
        <CreateWorkflowPanelHeader
          headerTitle={isMultiWorkflowTemplate ? resources.multiWorkflowCreateTitle : undefined}
          title={templateTitle}
          description={templateDescription}
        />
      ),
    [currentPanelView, templateTitle, templateDescription, manifest?.details, isMultiWorkflowTemplate, resources.multiWorkflowCreateTitle]
  );
  const onRenderFooterContent = useCallback(
    () =>
      selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={showCreate} {...selectedTabProps?.footerContent} /> : null,
    [selectedTabProps?.footerContent, showCreate]
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
        <QuickViewPanel workflowId={workflowId as string} clearDetailsOnClose={showCreate} />
      ) : null}
    </Panel>
  );
};
