import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateReviewList } from '../review/TemplateReviewList';
import type { TemplateWizardTabProps } from './model';

export const summaryTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SUMMARY,
  title: resources.ReviewTabLabel,
  content: <TemplateReviewList />,
  tabStatusIcon,
  disabled,
  footerContent: {
    buttonContents: [
      {
        type: 'button',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
        },
      },
      {
        type: 'button',
        text: resources.SaveButtonText,
        appreance: 'primary',
        onClick: () => {},
        //TODO
      },
    ],
  },
});
