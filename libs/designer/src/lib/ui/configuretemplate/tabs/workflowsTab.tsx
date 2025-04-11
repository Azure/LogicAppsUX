import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { DisplayWorkflows } from '../workflows/workflowslist';

export const workflowsTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  onSaveWorkflows: (isMultiWorkflow: boolean) => void
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS,
  title: resources.WorkflowsTabLabel,
  hasError: false,
  content: <DisplayWorkflows onSave={onSaveWorkflows} />,
  footerContent: {
    primaryButtonText: '',
    primaryButtonOnClick: () => {},
    showPrimaryButton: false,
    secondaryButtonText: resources.NextButtonText,
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
    },
  },
});
