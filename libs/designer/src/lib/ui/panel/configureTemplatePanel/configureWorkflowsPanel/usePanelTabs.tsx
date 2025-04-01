import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import { updateAllWorkflowsData } from '../../../../core/state/templates/templateSlice';
import { getWorkflowsWithDefinitions, initializeWorkflowsData } from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';

export const useConfigureWorkflowPanelTabs = (): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { workflowsInTemplate, workflowState } = useSelector((state: RootState) => ({
    workflowsInTemplate: state.template.workflows,
    workflowState: state.workflow,
  }));

  const hasError = false; // Placeholder for actual error state
  const isSaving = false; // Placeholder for actual saving state

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
    setSelectedWorkflowsList((prevSelectedWorkflows) => ({
      ...prevSelectedWorkflows,
      [workflowId]: {
        ...prevSelectedWorkflows[workflowId],
        ...workflowData,
      },
    }));
  };

  const onNextButtonClick = async () => {
    setSelectedWorkflowsList(await getWorkflowsWithDefinitions(workflowState, selectedWorkflowsList()));
  };

  const onSaveChanges = () => {
    dispatch(updateAllWorkflowsData(selectedWorkflowsList()));
    dispatch(initializeWorkflowsData({ workflows: selectedWorkflowsList() }));
  };

  const isNoWorkflowsSelected = Object.keys(selectedWorkflowsList()).length === 0;
  const missingNameOrDisplayName = Object.values(selectedWorkflowsList()).some(
    (workflow) => !workflow?.workflowName || !workflow?.manifest?.title
  );

  return [
    selectWorkflowsTab(intl, dispatch, {
      isSaving,
      selectedWorkflowsList: selectedWorkflowsList(),
      onWorkflowsSelected,
      onNextButtonClick,
      isPrimaryButtonDisabled: isNoWorkflowsSelected,
    }),
    customizeWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      selectedWorkflowsList: selectedWorkflowsList(),
      updateWorkflowDataField,
      onSaveChanges,
      disabled: isNoWorkflowsSelected,
      isPrimaryButtonDisabled: missingNameOrDisplayName,
    }),
  ];
};
