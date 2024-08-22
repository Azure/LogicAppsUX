import { Panel, PanelType } from '@fluentui/react';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel } from '../../../core/state/templates/panelSlice';
import { CreateWorkflowPanel } from './createWorkflowPanel/createWorkflowPanel';
import { QuickViewPanel, QuickViewPanelHeader } from './quickViewPanel/quickViewPanel';
import { type TemplatePanelTab, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCreateWorkflowPanelTabs } from './createWorkflowPanel/usePanelTabs';
import { clearTemplateDetails } from '../../../core/state/templates/templateSlice';
import { useIntl } from 'react-intl';
import { getQuickViewTabs } from '../../../core/templates/utils/helper';
import { useExistingWorkflowNames } from '../../../core/queries/template';

export const TemplatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => state.panel);
  const { templateName, resourceGroup } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    resourceGroup: state.workflow.resourceGroup,
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
            workflowAppName: resourceGroup,
          }),
    [currentPanelView, createWorkflowPanelTabs, intl, dispatch, templateName, resourceGroup]
  );

  const selectedTabProps = selectedTabId ? currentPanelTabs?.find((tab) => tab.id === selectedTabId) : currentPanelTabs[0];

  const intlText = useMemo(() => {
    return {
      CREATE_WORKFLOW: intl.formatMessage({
        defaultMessage: 'Create a new workflow',
        id: 'Y9VTmA',
        description: 'Panel header title for creating the workflow',
      }),
      BY_MICROSOFT: intl.formatMessage({
        defaultMessage: 'By Microsoft',
        id: 'Xs7Uvt',
        description: 'Panel description for stating it was created by Microsoft',
      }),
    };
  }, [intl]);

  const onRenderHeaderContent = useCallback(
    () =>
      currentPanelView === 'quickView' ? (
        <QuickViewPanelHeader title={templateTitle} description={templateDescription} details={manifest?.details ?? {}} />
      ) : (
        <TemplatesPanelHeader
          title={currentPanelView === 'createWorkflow' ? intlText.CREATE_WORKFLOW : templateTitle}
          description={currentPanelView === 'createWorkflow' ? templateDescription : intlText.BY_MICROSOFT}
        />
      ),
    [currentPanelView, templateTitle, templateDescription, manifest?.details, intlText.CREATE_WORKFLOW, intlText.BY_MICROSOFT]
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
