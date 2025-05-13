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
import { getResourceNameFromId, equals, isUndefinedOrEmptyString, getUniqueName, type Template } from '@microsoft/logic-apps-shared';
import { checkWorkflowNameWithRegex, validateWorkflowData } from '../../../../core/templates/utils/helper';
import { useMemo, useCallback } from 'react';
import { useResourceStrings } from '../../resources';

export const useConfigureWorkflowPanelTabs = ({
  onSave,
}: {
  onSave?: (isMultiWorkflow: boolean) => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWizardUpdating, workflowsInTemplate, workflowState, runValidation, currentPublishedState } = useSelector(
    (state: RootState) => ({
      workflowsInTemplate: state.template.workflows,
      isWizardUpdating: state.tab.isWizardUpdating,
      workflowState: state.workflow,
      runValidation: state.tab.runValidation,
      currentPublishedState: state.template.status,
    })
  );

  const hasError = false; // Placeholder for actual error state
  const resources = useResourceStrings();

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
        const [prevSelectedWorkflowId, prevSelectedWorkflow] = Object.entries(prevSelectedWorkflows).find(([, workflow]) =>
          equals(workflow.manifest?.metadata?.workflowSourceId, normalizedWorkflowId)
        ) ?? [undefined, undefined];

        const workflowId = prevSelectedWorkflowId ?? normalizedWorkflowId;
        const defaultIdFromResource = getResourceNameFromId(normalizedWorkflowId);

        const formattedSelectedIds = Object.values(prevSelectedWorkflows).map((workflow) => getResourceNameFromId(workflow.id as string));

        newSelectedWorkflows[workflowId] = prevSelectedWorkflow
          ? prevSelectedWorkflow
          : ({
              id: formattedSelectedIds.includes(defaultIdFromResource)
                ? getUniqueName(formattedSelectedIds, defaultIdFromResource).name
                : defaultIdFromResource,
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
      const formattedOtherSelectedIds = Object.entries(prevSelectedWorkflows).map(
        ([curWorkflowId, workflow]) => workflowId !== curWorkflowId && getResourceNameFromId(workflow.id as string)
      );

      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: {
            workflow: updatedWorkflowData.id
              ? formattedOtherSelectedIds.includes(updatedWorkflowData.id)
                ? intl.formatMessage({
                    defaultMessage: 'Name must be unique.',
                    id: 'u60lSZ',
                    description: 'Error message title for duplicate workflow ids',
                  })
                : checkWorkflowNameWithRegex(intl, updatedWorkflowData.id)
              : intl.formatMessage({
                  defaultMessage: 'Name must not be empty.',
                  id: '0/hw21',
                  description: 'Error message title for empty name',
                }),
            manifest: runValidation ? updatedManifestError : updatedWorkflowData?.errors?.manifest,
          },
        },
      };
    });
  };

  const onCustomizeWorkflowsTabNavigation = async () => {
    setSelectedWorkflowsList(await getWorkflowsWithDefinitions(workflowState, selectedWorkflowsList()));
  };

  const onSaveCompleted = useCallback(() => onSave?.(Object.keys(selectedWorkflowsList()).length > 1), [onSave, selectedWorkflowsList]);

  const onSaveChanges = (newPublishState: Template.TemplateEnvironment) => {
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

    // TODO: change below logic to API call then modify state
    if (hasWorkflowListChanged) {
      dispatch(initializeAndSaveWorkflowsData({ workflows: selectedWorkflowsList(), publishState: newPublishState, onSaveCompleted }));
    } else {
      dispatch(saveWorkflowsData({ workflows: selectedWorkflowsList(), publishState: newPublishState, onSaveCompleted }));
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
      onNextButtonClick: onCustomizeWorkflowsTabNavigation,
      isSaving: isWizardUpdating,
      isPrimaryButtonDisabled: isNoWorkflowsSelected,
    }),
    customizeWorkflowsTab(intl, resources, dispatch, {
      hasError,
      selectedWorkflowsList: selectedWorkflowsList(),
      onTabClick: onCustomizeWorkflowsTabNavigation,
      updateWorkflowDataField,
      isSaving: isWizardUpdating,
      disabled: isNoWorkflowsSelected,
      isPrimaryButtonDisabled: hasInvalidIdOrTitle || duplicateIds.length > 0,
      status: currentPublishedState,
      onSave: onSaveChanges,
      duplicateIds,
    }),
  ];
};
