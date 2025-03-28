import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
// import { useWorkflowsInApp } from '../../../../core/configuretemplate/utils/queries';
// import { WorkflowResource } from '@microsoft/logic-apps-shared';
// import { useEffect } from 'react';
// import { WorkflowResource } from '@microsoft/logic-apps-shared';

export const useConfigureWorkflowPanelTabs = ({
  onClosePanel,
}: {
  onClosePanel: () => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  // const { isConsumption, logicAppName, subscriptionId, resourceGroup, workflowsInTemplate } = useSelector((state: RootState) => ({
  //   isConsumption: !!state.workflow.isConsumption,
  //   logicAppName: state.workflow.logicAppName,
  //   subscriptionId: state.workflow.subscriptionId,
  //   resourceGroup: state.workflow.resourceGroup,
  //   workflowsInTemplate: state.template.workflows,
  //   selectedTabId: state.tab.selectedTabId,
  // }));
  // const { data: workflows } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);

  const hasError = false; // Placeholder for actual error state
  const isSaving = false; // Placeholder for actual saving state

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>({}); //TODO: update the initial value to the workflows in the template

  // Reset selected workflows when the workflows change
  // useEffect(() => {
  //   setSelectedWorkflowsList({});
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [workflows]);

  // const onSelectWorkflow = (workflowId: string, checked: boolean) => {
  //   setSelectedWorkflowsList((prevSelectedWorkflows) => {
  //     const normalizedWorkflowId = workflowId.toLowerCase();
  //     const newSelectedWorkflows = { ...prevSelectedWorkflows };
  //     if (checked) {
  //       newSelectedWorkflows[normalizedWorkflowId] = { id: normalizedWorkflowId };
  //     } else {
  //       delete newSelectedWorkflows[normalizedWorkflowId];
  //     }
  //     return newSelectedWorkflows;
  //   });
  // }

  const onWorkflowsSelected = (normalizedWorkflowIds: string[]) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = {};
      normalizedWorkflowIds.forEach((normalizedWorkflowId) => {
        newSelectedWorkflows[normalizedWorkflowId] = prevSelectedWorkflows[normalizedWorkflowId] ?? { id: normalizedWorkflowId };
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

  return [
    selectWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
      selectedWorkflowsList: selectedWorkflowsList(),
      onWorkflowsSelected,
    }),
    customizeWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
      selectedWorkflowsList: selectedWorkflowsList(),
      updateWorkflowDataField,
    }),
  ];
};

// const formatWorkflowsToTemplateData = (
//   selectedWorkflows: WorkflowResource[] | undefined,
//   workflows: Partial<WorkflowTemplateData>[],
// ): Partial<WorkflowTemplateData>[] => {
//   return selectedWorkflows?.map((workflow) => ({
//     id: workflow.id,
//   })) ?? [];
// }
