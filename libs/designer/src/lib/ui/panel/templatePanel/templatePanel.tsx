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
  clearDetailsOnClose?: boolean;
  onClose?: () => void;
}

export const TemplatePanel = ({ createWorkflow, onClose, showCreate, workflowId, clearDetailsOnClose = true }: TemplatePanelProps) => {
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
  const isCreatePanelView = useMemo(() => currentPanelView === 'createWorkflow', [currentPanelView]);
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

    if (clearDetailsOnClose) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [clearDetailsOnClose, dispatch, onClose]);

  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs({
    isMultiWorkflowTemplate,
    createWorkflow: createWorkflow ?? (() => Promise.resolve()),
  });
  const currentPanelTabs: TemplatePanelTab[] = useMemo(
    () =>
      isCreatePanelView
        ? createWorkflowPanelTabs
        : getQuickViewTabs(intl, dispatch, workflowId as string, showCreate, {
            templateId: templateName ?? 'Unknown',
            workflowAppName,
            isMultiWorkflow: isMultiWorkflowTemplate,
          }),
    [
      isCreatePanelView,
      createWorkflowPanelTabs,
      intl,
      dispatch,
      workflowId,
      showCreate,
      templateName,
      workflowAppName,
      isMultiWorkflowTemplate,
    ]
  );

  const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];
  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const onRenderHeaderContent = useCallback(
    () =>
      isCreatePanelView ? (
        <CreateWorkflowPanelHeader
          headerTitle={isMultiWorkflowTemplate ? resources.multiWorkflowCreateTitle : undefined}
          title={templateTitle}
          description={templateDescription}
        />
      ) : (
        <QuickViewPanelHeader title={templateTitle} description={templateDescription} details={manifest?.details ?? {}} />
      ),
    [isCreatePanelView, isMultiWorkflowTemplate, resources.multiWorkflowCreateTitle, templateTitle, templateDescription, manifest?.details]
  );
  const onRenderFooterContent = useCallback(
    () =>
      selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={showCreate} {...selectedTabProps?.footerContent} /> : null,
    [selectedTabProps?.footerContent, showCreate]
  );
  const { refetch: refetchWorkflowNames } = useExistingWorkflowNames();
  useEffect(() => {
    if (isOpen && isCreatePanelView) {
      refetchWorkflowNames();
    }
  }, [isOpen, currentPanelView, refetchWorkflowNames, isCreatePanelView]);

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss
      type={isCreatePanelView ? PanelType.custom : PanelType.medium}
      customWidth={'50%'}
      isOpen={isOpen}
      onDismiss={dismissPanel}
      hasCloseButton={true}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      {isCreatePanelView ? (
        <CreateWorkflowPanel panelTabs={createWorkflowPanelTabs} />
      ) : currentPanelView === 'quickView' ? (
        <QuickViewPanel workflowId={workflowId as string} clearDetailsOnClose={clearDetailsOnClose} />
      ) : null}
    </Panel>
  );
};
