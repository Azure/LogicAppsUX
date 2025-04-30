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
  initializeAndSaveWorkflowsData,
  saveWorkflowsData,
} from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId, equals, isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import { checkWorkflowNameWithRegex, validateWorkflowData } from '../../../../core/templates/utils/helper';
import { useMemo, useCallback } from 'react';

export const useConfigureWorkflowPanelTabs = ({
  onSave,
}: {
  onSave?: (isMultiWorkflow: boolean) => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWizardUpdating, workflowsInTemplate, workflowState, runValidation } = useSelector((state: RootState) => ({
    workflowsInTemplate: state.template.workflows,
    isWizardUpdating: state.tab.isWizardUpdating,
    workflowState: state.workflow,
    runValidation: state.tab.runValidation,
  }));

  const [selectedWorkflowsList, setSelectedWorkflowsList] =
    useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>(workflowsInTemplate);

  const currentSelectedWorkflowsList = selectedWorkflowsList();
  const duplicateIds = useMemo(() => {
    const seen = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const { id } of Object.values(currentSelectedWorkflowsList)) {
      if (!id) {
        continue;
      }
      if (seen.has(id)) {
        duplicateIds.add(id);
      }
      seen.add(id);
    }
    return Array.from(duplicateIds);
  }, [currentSelectedWorkflowsList]);

  const onWorkflowsSelected = (normalizedWorkflowIds: string[]) => {
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = {};
      for (const normalizedWorkflowId of normalizedWorkflowIds) {
        const [preSelectedWorkflowId, prevSelectedWorkflow] = Object.entries(prevSelectedWorkflows).find(([, workflow]) =>
          equals(workflow.manifest?.metadata?.workflowSourceId, normalizedWorkflowId)
        ) ?? [undefined, undefined];

        const workflowId = preSelectedWorkflowId ?? normalizedWorkflowId;

        newSelectedWorkflows[workflowId] = prevSelectedWorkflow
          ? prevSelectedWorkflow
          : ({
              id: getResourceNameFromId(normalizedWorkflowId),
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
      const updatedManifestError = validateWorkflowData(updatedWorkflowData, Object.keys(prevSelectedWorkflows).length > 1);
      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: {
            workflow: updatedWorkflowData.id ? checkWorkflowNameWithRegex(intl, updatedWorkflowData.id) : undefined,
            manifest: runValidation ? updatedManifestError : updatedWorkflowData?.errors?.manifest,
          },
        },
      };
    });
  };

  const onNextButtonClick = async () => {
    setSelectedWorkflowsList(await getWorkflowsWithDefinitions(workflowState, selectedWorkflowsList()));
  };

  const onSaveCompleted = useCallback(() => onSave?.(Object.keys(selectedWorkflowsList()).length > 1), [onSave, selectedWorkflowsList]);

  const onSaveChanges = () => {
    // 1. Update the workflowId with user-input id (For newly selected workflow)
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      const newSelectedWorkflows: Record<string, Partial<WorkflowTemplateData>> = prevSelectedWorkflows;
      for (const [workflowId, workflowData] of Object.entries(prevSelectedWorkflows)) {
        if (workflowData.id && workflowId !== workflowData.id) {
          prevSelectedWorkflows[workflowData.id] = workflowData;
          delete prevSelectedWorkflows[workflowId];
        }
      }
      return newSelectedWorkflows;
    });

    // 2. With updated workflowIds, dispatch based on whether workflows data have changed
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
      dispatch(initializeAndSaveWorkflowsData({ workflows: selectedWorkflowsList(), onSaveCompleted }));
    } else {
      dispatch(saveWorkflowsData({ workflows: selectedWorkflowsList(), onSaveCompleted }));
    }
  };

  const isNoWorkflowsSelected = Object.keys(selectedWorkflowsList()).length === 0;
  const hasInvalidIdOrTitle = Object.values(selectedWorkflowsList()).some(
    (workflow) =>
      isUndefinedOrEmptyString(workflow?.id) ||
      !isUndefinedOrEmptyString(workflow?.errors?.workflow) ||
      (Object.keys(selectedWorkflowsList()).length > 1 && !workflow?.manifest?.title)
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
      selectedWorkflowsList: selectedWorkflowsList(),
      updateWorkflowDataField,
      isSaving: isWizardUpdating,
      disabled: isNoWorkflowsSelected,
      isPrimaryButtonDisabled: hasInvalidIdOrTitle || duplicateIds.length > 0,
      onSave: onSaveChanges,
      duplicateIds,
    }),
  ];
};
