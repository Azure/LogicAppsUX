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
import { useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import type { CreateWorkflowHandler } from '../../templates';

export interface TemplatePanelProps {
  showCreate: boolean;
  workflowId: string;
  createWorkflow?: CreateWorkflowHandler;
  onClose?: () => void;
}

export const TemplatePanel = ({ createWorkflow, onClose, showCreate, workflowId }: TemplatePanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const {
    templateName,
    workflowAppName,
    existingWorkflowName,
    connections,
    isConsumption,
    connectionsError,
    parametersError,
    parameterDefinitions,
  } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
    existingWorkflowName: state.workflow.existingWorkflowName,
    connections: state.workflow.connections,
    isConsumption: state.workflow.isConsumption,
    connectionsError: state.template.errors.connections,
    parametersError: state.template.errors.parameters,
    parameterDefinitions: state.template.parameterDefinitions,
  }));
  const { manifest, workflowName, kind, errors, workflowDefinition } = useWorkflowTemplate(workflowId);
  const templateTitle = manifest?.title ?? '';
  const templateDescription = manifest?.description ?? '';

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());

    if (showCreate) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [dispatch, onClose, showCreate]);

  const onCreateClick = useCallback(async () => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    const isMissingInfoForStandard = !workflowNameToUse || !kind || errors?.kind;

    const isMissingInfo =
      (!isConsumption && isMissingInfoForStandard) ||
      errors?.workflow ||
      !workflowDefinition ||
      connectionsError ||
      Object.values(parametersError)?.filter((error) => error).length > 0;

    if (isMissingInfo) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'Missing information for workflow creation',
          id: 'wBBu4g',
          description: 'Error message when missing information for workflow creation',
        })
      );
    }

    await createWorkflow?.(workflowNameToUse, kind, workflowDefinition, connections, parameterDefinitions);
  }, [
    connections,
    connectionsError,
    createWorkflow,
    errors?.kind,
    errors?.workflow,
    existingWorkflowName,
    intl,
    isConsumption,
    kind,
    parameterDefinitions,
    parametersError,
    workflowDefinition,
    workflowName,
  ]);

  const createWorkflowPanelTabs = useCreateWorkflowPanelTabs({
    onCreateClick,
    workflowId,
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
        <CreateWorkflowPanelHeader title={templateTitle} description={templateDescription} />
      ),
    [currentPanelView, templateTitle, templateDescription, manifest?.details]
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
        <QuickViewPanel workflowId={workflowId} showCreate={showCreate} />
      ) : null}
    </Panel>
  );
};
