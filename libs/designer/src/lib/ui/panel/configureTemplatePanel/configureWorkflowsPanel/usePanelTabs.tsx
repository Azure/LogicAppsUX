import type { TemplateTabProps } from '@microsoft/designer-ui';
import { selectWorkflowsTab } from './tabs/selectWorkflowsTab';
import { customizeWorkflowsTab } from './tabs/customizeWorkflowsTab';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../../core/state/templates/store';

export const useConfigureWorkflowPanelTabs = ({
  onClosePanel,
  onSave,
}: {
  onClosePanel: () => void;
  onSave?: (isMultiWorkflow: boolean) => void;
}): TemplateTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const hasError = false; // Placeholder for actual error state
  const isSaving = false; // Placeholder for actual saving state

  return [
    selectWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
    }),
    customizeWorkflowsTab(intl, dispatch, {
      hasError,
      isSaving,
      onClosePanel,
      onSave,
    }),
  ];
};
