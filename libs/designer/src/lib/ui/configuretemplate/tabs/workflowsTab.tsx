import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { DisplayWorkflows } from '../workflows/workflowslist';
import type { TemplateWizardTabProps } from './model';

export const workflowsTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  onSaveWorkflows: (isMultiWorkflow: boolean) => void,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS,
  title: resources.WorkflowsTabLabel,
  tabStatusIcon,
  content: <DisplayWorkflows onSave={onSaveWorkflows} />,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: resources.NextButtonText,
        appearance: 'primary',
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
        },
        disabled,
      },
    ],
  },
});
