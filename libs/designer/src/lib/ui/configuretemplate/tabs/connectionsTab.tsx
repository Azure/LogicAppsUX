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
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS));
        },
      },
      {
        type: 'navigation',
        text: resources.NextButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
        },
      },
    ],
  },
});
