import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateManifestForm } from '../templateprofile/manifestform';
import type { CreateWizardTabProps } from './model';

export const profileTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: CreateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE,
  title: intl.formatMessage({
    defaultMessage: 'Profile',
    id: '6ELsbA',
    description: 'The tab label for the monitoring profile tab on the configure template wizard',
  }),
  tabStatusIcon,
  disabled,
  content: <TemplateManifestForm />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH));
    },
  },
});
