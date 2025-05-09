import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateReviewList } from '../review/TemplateReviewList';
import type { TemplateWizardTabProps } from './model';
import { getSaveMenuButtons } from '../../../core/configuretemplate/utils/helper';

export const summaryTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  {
    disabled,
    tabStatusIcon,
    onSave,
    status,
    onDownloadTemplate,
  }: TemplateWizardTabProps & {
    onDownloadTemplate: () => void;
  }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SUMMARY,
  title: resources.SummaryTabLabel,
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
        menuItems: getSaveMenuButtons(resources, status ?? 'Development', (newStatus) => onSave?.(newStatus)),
      },
      {
        type: 'divider',
      },
      {
        type: 'button',
        text: resources.DownloadTemplateButton,
        appreance: 'subtle',
        onClick: onDownloadTemplate,
      },
    ],
  },
});
