import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateConnectionsList } from '../connections/connectionslist';
import type { CreateWizardTabProps } from './model';

export const connectionsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: CreateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'ur+ZvW',
    description: 'The tab label for the monitoring connections tab on the configure template wizard',
  }),
  tabStatusIcon,
  disabled,
  content: <TemplateConnectionsList />,
  description: intl.formatMessage({
    defaultMessage: 'Connections for the following connectors would be required during workflow creation from this template.',
    id: 'sOd/ie',
    description: 'The description for the connections tab on the configure template wizard',
  }),
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
    },
  },
});
