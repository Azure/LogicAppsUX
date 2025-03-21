import type { AppDispatch } from '../../state/templates/store';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../state/templates/tabSlice';

export const PublishTab = () => {
  return <Text>placeholder - show publish</Text>;
};

export const publishTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.PUBLISH,
  title: intl.formatMessage({
    defaultMessage: 'Publish',
    id: 'mI+yA/',
    description: 'The tab label for the monitoring publish tab on the configure template wizard',
  }),
  hasError: false,
  content: <PublishTab />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Q1LEiE',
      description: 'Button text for going back to the previous tab',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.PROFILE));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.REVIEW_AND_PUBLISH));
    },
  },
});
