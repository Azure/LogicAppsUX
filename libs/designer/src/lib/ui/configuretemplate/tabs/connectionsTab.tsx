import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateConnectionsList } from '../connections/connectionslist';
import type { TemplateWizardTabProps } from './model';

export const connectionsTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
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
    buttonContents: [
      {
        type: 'button',
        text: resources.PreviousButtonText,
        appreance: 'primary',
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS));
        },
      },
      {
        type: 'button',
        text: resources.NextButtonText,
        appreance: 'primary',
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
        },
      },
    ],
  },
});
