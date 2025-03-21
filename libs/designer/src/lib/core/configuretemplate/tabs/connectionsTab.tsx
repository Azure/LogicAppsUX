import type { AppDispatch } from '../../state/templates/store';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../state/templates/tabSlice';

export const ConnectionsTab = () => {
  return <Text>placeholder - show connections</Text>;
};

export const connectionsTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'ur+ZvW',
    description: 'The tab label for the monitoring connections tab on the configure template wizard',
  }),
  hasError: false,
  content: <ConnectionsTab />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.WORKFLOWS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.PARAMETERS));
    },
  },
});
