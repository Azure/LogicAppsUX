import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateConnectionsList } from '../connections/connectionslist';

export const connectionsTab = (intl: IntlShape, resources: Record<string, string>, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS,
  title: resources.ConnectionsTabLabel,
  hasError: false,
  content: <TemplateConnectionsList />,
  description: intl.formatMessage({
    defaultMessage: 'Connections for the following connectors would be required during workflow creation from this template.',
    id: 'sOd/ie',
    description: 'The description for the connections tab on the configure template wizard',
  }),
  footerContent: {
    primaryButtonText: resources.PreviousButtonText,
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS));
    },
    secondaryButtonText: resources.NextButtonText,
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
    },
  },
});
