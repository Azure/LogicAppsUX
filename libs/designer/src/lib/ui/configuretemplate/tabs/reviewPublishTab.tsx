import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateReviewList } from '../review/TemplateReviewList';

export const reviewPublishTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  onPublish: () => void
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW_AND_PUBLISH,
  title: resources.ReviewPublishTabLabel,
  hasError: false,
  content: <TemplateReviewList />,
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
