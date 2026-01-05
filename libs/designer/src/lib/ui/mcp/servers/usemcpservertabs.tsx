import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/mcp/store';
import { useFunctionalState } from '@react-hookz/web';
import type { WorkflowTemplateData } from '../../../../core';
import { getWorkflowsWithDefinitions, addWorkflowsData } from '../../../../core/actions/bjsworkflow/configuretemplate';
import { getResourceNameFromId, equals, isUndefinedOrEmptyString, getUniqueName, clone } from '@microsoft/logic-apps-shared';
import { checkWorkflowNameWithRegex, validateWorkflowData } from '../../../../core/templates/utils/helper';
import { useMemo, useCallback } from 'react';
import { useResourceStrings } from '../../resources';

export const useMcpServerTabs = (): TemplateTabProps[] => {
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
