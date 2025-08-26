import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, TemplatePanelView } from '../../../../../core/state/templates/panelSlice';
import { type TemplateTabProps, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import type { WorkflowTemplateData } from '../../../../../core';
import { isUndefinedOrEmptyString, type Template } from '@microsoft/logic-apps-shared';
import { customizeWorkflowsTab } from '../tabs/customizeWorkflowsTab';
import { useFunctionalState } from '@react-hookz/web';
import { useResourceStrings } from '../../../resources';
import { validateWorkflowData } from '../../../../../core/templates/utils/helper';
import { saveWorkflowsData } from '../../../../../core/actions/bjsworkflow/configuretemplate';

export interface EditWorkflowPanelProps {
  onTabClick?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  isPrimaryButtonDisabled: boolean;
  isSaving: boolean;
  onSave?: (status: Template.TemplateEnvironment) => void;
  onClose?: () => void;
  status?: Template.TemplateEnvironment;
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const EditWorkflowsPanel = ({
  selectedWorkflowIds,
  onSave,
}: {
  selectedWorkflowIds: string[];
  onSave?: (isMultiWorkflow: boolean) => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { isWizardUpdating, workflows, isOpen, currentPanelView, currentPublishedState, runValidation } = useSelector(
    (state: RootState) => ({
      isWizardUpdating: state.tab.isWizardUpdating,
      isOpen: state.panel.isOpen,
      currentPanelView: state.panel.currentPanelView,
      workflows: state.template.workflows,
      currentPublishedState: state.template.status,
      runValidation: state.tab.runValidation,
    })
  );
  const resources = useResourceStrings();

  const [isDirty, setIsDirty] = useState(false);
  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>(
    Object.fromEntries(Object.entries(workflows).filter(([_key, data]) => selectedWorkflowIds.includes(data.id)))
  );

  // Note: onSave toaster logic is determined by how many workflows ins present in the template currently
  // TODO: change this as toaster content is to-be-updated
  const onSaveCompleted = useCallback(() => onSave?.(Object.keys(workflows).length > 1), [onSave, workflows]);

  const updateWorkflowDataField = (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const updatedWorkflowData = {
        ...prevSelectedWorkflows[workflowId],
        ...workflowData,
      };
      const updatedManifestError = validateWorkflowData(updatedWorkflowData, Object.keys(prevSelectedWorkflows).length > 1);

      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: {
            general: undefined,
            workflow: undefined,
            manifest: runValidation ? updatedManifestError : updatedWorkflowData?.errors?.manifest,
          },
        },
      };
    });
    setIsDirty(true);
  };

  const onSaveChanges = () => {
    dispatch(saveWorkflowsData({ workflows: selectedWorkflowsList(), onSaveCompleted }));
  };

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader
        title={intl.formatMessage({
          defaultMessage: 'Edit workflows',
          id: '3hs3ud',
          description: 'Panel header title for editing workflows',
        })}
      >
        <div />
      </TemplatesPanelHeader>
    ),
    [intl]
  );

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
  }, [dispatch]);

  const hasInvalidOrMissingTitle = Object.values(selectedWorkflowsList()).some(
    (workflow) =>
      !isUndefinedOrEmptyString(workflow?.errors?.workflow) ||
      (Object.keys(selectedWorkflowsList()).length > 1 && !workflow?.manifest?.title)
  );

  const panelTab: TemplateTabProps = customizeWorkflowsTab(intl, resources, dispatch, {
    selectedWorkflowsList: selectedWorkflowsList(),
    updateWorkflowDataField,
    isSaving: isWizardUpdating,
    disabled: isDirty,
    isPrimaryButtonDisabled: !isDirty || hasInvalidOrMissingTitle,
    status: currentPublishedState,
    onSave: onSaveChanges,
    onClose: dismissPanel,
    duplicateIds: [],
  });

  const onRenderFooterContent = useCallback(
    () => (panelTab?.footerContent ? <TemplatesPanelFooter {...panelTab?.footerContent} /> : null),
    [panelTab?.footerContent]
  );

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss={false}
      type={PanelType.custom}
      customWidth={'50%'}
      isOpen={isOpen && currentPanelView === TemplatePanelView.EditWorkflows}
      onDismiss={dismissPanel}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      hasCloseButton={true}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      {panelTab?.content}
    </Panel>
  );
};
