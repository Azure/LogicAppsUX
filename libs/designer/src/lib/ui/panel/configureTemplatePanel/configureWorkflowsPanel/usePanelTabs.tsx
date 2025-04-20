import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import { getWorkflowsWithDefinitions, initializeWorkflowsData } from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { validateWorkflowData } from '../../../../core/templates/utils/helper';

export const useConfigureWorkflowPanelTabs = ({
  onSave,
}: {
  onSave?: (isMultiWorkflow: boolean) => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWizardUpdating, workflowsInTemplate, workflowState } = useSelector((state: RootState) => ({
    workflowsInTemplate: state.template.workflows,
    isWizardUpdating: state.tab.isWizardUpdating,
    workflowState: state.workflow,
  }));

  const hasError = false; // Placeholder for actual error state

  const [selectedWorkflowsList, setSelectedWorkflowsList] =
    useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>(workflowsInTemplate);

  const onWorkflowsSelected = (normalizedWorkflowIds: string[]) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = {};
      for (const normalizedWorkflowId of normalizedWorkflowIds) {
        newSelectedWorkflows[normalizedWorkflowId] = prevSelectedWorkflows[normalizedWorkflowId] ?? {
          id: normalizedWorkflowId,
          workflowName: getResourceNameFromId(normalizedWorkflowId),
        };
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
      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: validateWorkflowData(updatedWorkflowData),
        },
      };
    });
  };

  const onNextButtonClick = async () => {
    setSelectedWorkflowsList(await getWorkflowsWithDefinitions(workflowState, selectedWorkflowsList()));
  };

  const onSaveChanges = () => {
    dispatch(initializeWorkflowsData({ workflows: selectedWorkflowsList() }));
    onSave?.(Object.keys(selectedWorkflowsList()).length > 1);
  };

  const isNoWorkflowsSelected = Object.keys(selectedWorkflowsList()).length === 0;
  const missingNameOrDisplayName = Object.values(selectedWorkflowsList()).some(
    (workflow) => !workflow?.workflowName || !workflow?.manifest?.title
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
