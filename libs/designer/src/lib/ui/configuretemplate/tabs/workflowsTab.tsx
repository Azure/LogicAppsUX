import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { DisplayWorkflows } from '../workflows/workflows';

export const workflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  onSaveWorkflows: (isMultiWorkflow: boolean) => void
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Workflows',
    id: 'R7VvvJ',
    description: 'The tab label for the monitoring workflows tab on the configure template wizard',
  }),
  hasError: false,
  content: <DisplayWorkflows onSave={onSaveWorkflows} />,
  footerContent: {
    primaryButtonText: '',
    primaryButtonOnClick: () => {},
    showPrimaryButton: false,
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
    },
  },
});
