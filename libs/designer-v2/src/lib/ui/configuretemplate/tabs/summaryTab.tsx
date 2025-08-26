import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateReviewList } from '../review/TemplateReviewList';
import type { TemplateWizardTabProps } from './model';
import { getSaveMenuButtons } from '../../../core/configuretemplate/utils/helper';
import { ArrowDownload20Regular } from '@fluentui/react-icons';
import { mergeStyles } from '@fluentui/react';

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
        type: 'navigation',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
        },
      },
      {
        type: 'navigation',
        text: resources.NextButtonText,
        disabled: true, // Next button is disabled in summary tab
        onClick: () => {},
      },
      {
        type: 'action',
        text: resources.SaveButtonText,
        appearance: 'primary',
        onClick: () => {},
        menuItems: getSaveMenuButtons(resources, status ?? 'Development', (newStatus) => onSave?.(newStatus)),
      },
      {
        type: 'action',
        text: resources.DownloadTemplateButton,
        appearance: 'transparent',
        className: mergeStyles({ marginLeft: '20px !important', color: '#0088f7 !important' }),
        icon: <ArrowDownload20Regular />,
        onClick: onDownloadTemplate,
      },
    ],
  },
});
