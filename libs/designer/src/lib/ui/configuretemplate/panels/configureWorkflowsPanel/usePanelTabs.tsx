import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import {
  getWorkflowsWithDefinitions,
  initializeWorkflowsData,
  saveWorkflowsInTemplate,
} from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId, equals } from '@microsoft/logic-apps-shared';
import { validateWorkflowData } from '../../../../core/templates/utils/helper';
import { useCallback } from 'react';
import { closePanel } from '../../../../core/state/templates/panelSlice';

export const useConfigureWorkflowPanelTabs = ({
  onSave,
}: {
  onSave?: (isMultiWorkflow: boolean) => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWizardUpdating, workflowsInTemplate, templateState, workflowState, runValidation } = useSelector((state: RootState) => ({
    workflowsInTemplate: state.template.workflows,
    isWizardUpdating: state.tab.isWizardUpdating,
    workflowState: state.workflow,
    templateState: state.template,
    runValidation: state.tab.runValidation,
  }));

  const hasError = false; // Placeholder for actual error state

  const [selectedWorkflowsList, setSelectedWorkflowsList] =
    useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>(workflowsInTemplate);

  const onWorkflowsSelected = (normalizedWorkflowIds: string[]) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = {};
      for (const normalizedWorkflowId of normalizedWorkflowIds) {
        const prevSelectedWorkflow = Object.values(prevSelectedWorkflows).find((workflow) =>
          equals(workflow.manifest?.metadata?.workflowSourceId, normalizedWorkflowId)
        );
        const id = prevSelectedWorkflow?.id ?? getResourceNameFromId(normalizedWorkflowId);
        newSelectedWorkflows[id] = prevSelectedWorkflow
          ? prevSelectedWorkflow
          : ({
              id,
              manifest: {
                kinds: ['stateful', 'stateless'],
                metadata: {
                  workflowSourceId: normalizedWorkflowId,
                },
              },
            } as Partial<WorkflowTemplateData>);
      }
      return newSelectedWorkflows;
    });
  };

  const updateWorkflowDataField = (workflowId: string, workflowData: Partial<WorkflowTemplateData>) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const updatedWorkflowData = {
        ...prevSelectedWorkflows[workflowId],
        ...workflowData,
      };
      const { workflow: workflowNameError, manifest: updatedManifestError } = validateWorkflowData(
        updatedWorkflowData,
        Object.keys(prevSelectedWorkflows).length > 1
      );
      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: {
            workflow: workflowNameError,
            manifest: runValidation ? updatedManifestError : updatedWorkflowData?.errors?.manifest,
          },
        },
      };
    });
  };

  const onNextButtonClick = async () => {
    setSelectedWorkflowsList(await getWorkflowsWithDefinitions(workflowState, selectedWorkflowsList()));
  };

  const onSaveWorkflowsInTemplate = useCallback(
    async (clearWorkflows: boolean) => {
      await saveWorkflowsInTemplate(templateState, clearWorkflows);
      onSave?.(Object.keys(selectedWorkflowsList()).length > 1);

      if (!clearWorkflows) {
        dispatch(closePanel());
      }
    },
    [templateState, onSave, selectedWorkflowsList, dispatch]
  );

  const onSaveChanges = () => {
    const selectedWorkflowIds = Object.values(selectedWorkflowsList()).map((workflow) =>
      workflow.manifest?.metadata?.workflowSourceId?.toLowerCase()
    );
    const originalWorkflowIds = Object.values(workflowsInTemplate).map((workflow) =>
      workflow.manifest?.metadata?.workflowSourceId?.toLowerCase()
    );
    const hasWorkflowListChanged =
      originalWorkflowIds.length === selectedWorkflowIds.length
        ? originalWorkflowIds.some((resourceId) => !selectedWorkflowIds.includes(resourceId))
        : true;

    if (hasWorkflowListChanged) {
      dispatch(initializeWorkflowsData({ workflows: selectedWorkflowsList(), onCompleted: () => onSaveWorkflowsInTemplate(true) }));
    } else {
      onSaveWorkflowsInTemplate(false);
    }
  };

  const isNoWorkflowsSelected = Object.keys(selectedWorkflowsList()).length === 0;
  const missingNameOrDisplayName = Object.values(selectedWorkflowsList()).some(
    (workflow) => !workflow?.workflowName || (Object.keys(selectedWorkflowsList()).length > 1 && !workflow?.manifest?.title)
  );

  return [
    selectWorkflowsTab(intl, dispatch, {
      selectedWorkflowsList: selectedWorkflowsList(),
      onWorkflowsSelected,
      onNextButtonClick,
      isSaving: isWizardUpdating,
      isPrimaryButtonDisabled: isNoWorkflowsSelected,
    }),
    customizeWorkflowsTab(intl, dispatch, {
      hasError,
      selectedWorkflowsList: selectedWorkflowsList(),
      updateWorkflowDataField,
      isSaving: isWizardUpdating,
      disabled: isNoWorkflowsSelected,
      isPrimaryButtonDisabled: missingNameOrDisplayName,
      onSave: onSaveChanges,
    }),
  ];
};
