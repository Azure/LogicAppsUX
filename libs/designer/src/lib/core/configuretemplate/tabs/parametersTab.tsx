import type { AppDispatch } from '../../state/templates/store';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from 'lib/core/state/templates/tabSlice';

export const ParametersTab = () => {
  return <Text>placeholder - show parameters</Text>;
};

export const parametersTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'lYAlE9',
    description: 'The tab label for the monitoring parameters tab on the configure template wizard',
  }),
  hasError: false,
  content: <ParametersTab />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.CONNECTIONS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.DETAILS));
    },
  },
});
