import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateReviewList } from '../review/TemplateReviewList';
import type { TemplateWizardTabProps } from './model';

export const reviewTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  onPublish: () => void,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW,
  title: resources.ReviewTabLabel,
  content: <TemplateReviewList />,
  tabStatusIcon,
  disabled,
  footerContent: {
    primaryButtonText: resources.PreviousButtonText,
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Publish',
      id: 'RkT4rN',
      description: 'Button text for publishing the template',
    }),
    secondaryButtonOnClick: () => {
      //TODO: service call to publish the template
      onPublish();
    },
  },
});
