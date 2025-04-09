import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateParametersList } from '../parameters/parameterslist';

export const parametersTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'lYAlE9',
    description: 'The tab label for the monitoring parameters tab on the configure template wizard',
  }),
  hasError: false,
  content: <TemplateParametersList />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
    },
  },
});
