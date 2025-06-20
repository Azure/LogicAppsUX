import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import { getWorkflowsWithDefinitions, addWorkflowsData } from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId, equals, isUndefinedOrEmptyString, getUniqueName, clone } from '@microsoft/logic-apps-shared';
import { checkWorkflowNameWithRegex, validateWorkflowData } from '../../../../core/templates/utils/helper';
import { useMemo, useCallback } from 'react';
import { useResourceStrings } from '../../resources';

export const useConfigureWorkflowPanelTabs = ({
  onSave,
  onClose,
}: {
  onSave?: (isMultiWorkflow: boolean) => void;
  onClose?: () => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWizardUpdating, workflowState, runValidation, currentPublishedState, workflowsInTemplate } = useSelector(
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

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<Record<string, Partial<WorkflowTemplateData>>>({});

  const currentSelectedWorkflowsList = selectedWorkflowsList();
  const duplicateIds = useMemo(() => {
    // Combine workflows in template and currently selected workflows (with new user-input id) to check for duplicates
    const combinedWorkflowsUsingIds = { ...workflowsInTemplate, ...currentSelectedWorkflowsList };
    const seen = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const { id } of Object.values(combinedWorkflowsUsingIds)) {
      if (!id) {
        continue;
      }
      if (seen.has(id)) {
        duplicateIds.add(id);
      }
      seen.add(id);
    }
    return Array.from(duplicateIds);
  }, [workflowsInTemplate, currentSelectedWorkflowsList]);

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
              errors: {
                general: undefined,
                workflow: undefined,
                manifest: undefined,
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
      const combinedWorkflowsUsingIds = { ...workflowsInTemplate, ...prevSelectedWorkflows };
      const formattedOtherSelectedIds = Object.entries(combinedWorkflowsUsingIds).map(
        ([curWorkflowId, workflow]) => workflowId !== curWorkflowId && getResourceNameFromId(workflow.id as string)
      );

      return {
        ...prevSelectedWorkflows,
        [workflowId]: {
          ...updatedWorkflowData,
          errors: {
            general: undefined,
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

  const onSaveCompleted = useCallback(
    () =>
      onSave?.(
        Object.keys({
          ...workflowsInTemplate,
          ...selectedWorkflowsList(),
        }).length > 1
      ),
    [onSave, workflowsInTemplate, selectedWorkflowsList]
  );

  const onSaveChanges = () => {
    // Update the workflowId with user-input id (For newly selected workflow)
    setSelectedWorkflowsList((prevSelectedWorkflows) => {
      for (const [workflowId, workflowData] of Object.entries(prevSelectedWorkflows)) {
        const modifiedWorkflowData = clone(workflowData);
        modifiedWorkflowData.isManageWorkflow = true;

        if (modifiedWorkflowData.id && workflowId !== modifiedWorkflowData.id) {
          prevSelectedWorkflows[modifiedWorkflowData.id] = modifiedWorkflowData;
          delete prevSelectedWorkflows[workflowId];
        }
      }
      return prevSelectedWorkflows;
    });

    dispatch(addWorkflowsData({ workflows: selectedWorkflowsList(), onSaveCompleted }));
  };

  const isNoWorkflowsSelected = Object.keys(selectedWorkflowsList()).length === 0;
  const hasInvalidIdOrTitle = Object.values(selectedWorkflowsList()).some(
    (workflow) =>
      isUndefinedOrEmptyString(workflow?.id) ||
      !isUndefinedOrEmptyString(workflow?.errors?.workflow) ||
      (Object.keys({
        ...workflowsInTemplate,
        ...selectedWorkflowsList(),
      }).length > 1 &&
        !workflow?.manifest?.title)
  );

  return [
    selectWorkflowsTab(intl, dispatch, {
      selectedWorkflowsList: selectedWorkflowsList(),
      onWorkflowsSelected,
      onNextButtonClick: onCustomizeWorkflowsTabNavigation,
      onClose,
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
      onClose,
      duplicateIds,
    }),
  ];
};
