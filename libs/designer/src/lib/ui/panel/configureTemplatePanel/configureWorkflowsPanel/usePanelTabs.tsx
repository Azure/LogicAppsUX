import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import { updateAllWorkflowsData } from '../../../../core/state/templates/templateSlice';
import {
  getWorkflownameFromWorkflowId,
  getWorkflowsWithDefinitions,
  initializeWorkflowsData,
} from '../../../../core/actions/bjsworkflow/configuretemplate';

export const useConfigureWorkflowPanelTabs = ({
  onClosePanel,
}: {
  onClosePanel: () => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { workflowsInTemplate, workflowState } = useSelector((state: RootState) => ({
    workflowsInTemplate: state.template.workflows,
    workflowState: state.workflow,
  }));

  const hasError = false; // Placeholder for actual error state
  const isSaving = false; // Placeholder for actual saving state

  const [selectedWorkflowsList, setSelectedWorkflowsList] =
    useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>(workflowsInTemplate); //TODO: update the initial value to the workflows in the template

  const onWorkflowsSelected = (normalizedWorkflowIds: string[]) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = {};
      normalizedWorkflowIds.forEach((normalizedWorkflowId) => {
        newSelectedWorkflows[normalizedWorkflowId] = prevSelectedWorkflows[normalizedWorkflowId] ?? {
          id: normalizedWorkflowId,
          workflowName: getWorkflownameFromWorkflowId(normalizedWorkflowId),
        };
      });
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
    dispatch(initializeWorkflowsData({}));
  };

  const missingNameOrDisplayName = Object.values(selectedWorkflowsList()).some(
    (workflow) => !workflow?.workflowName || !workflow?.manifest?.title
  );

  return [
    selectWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
      selectedWorkflowsList: selectedWorkflowsList(),
      onWorkflowsSelected,
      onNextButtonClick,
    }),
    customizeWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
      selectedWorkflowsList: selectedWorkflowsList(),
      updateWorkflowDataField,
      onSaveChanges,
      disabled: missingNameOrDisplayName,
    }),
  ];
};
