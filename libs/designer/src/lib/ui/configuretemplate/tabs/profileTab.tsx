import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateManifestForm } from '../templateprofile/manifestform';
import type { TemplateWizardTabProps } from './model';

export const profileTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE,
  title: resources.ProfileTabLabel,
  tabStatusIcon,
  disabled,
  content: <TemplateManifestForm />,
  footerContent: {
    primaryButtonText: resources.PreviousButtonText,
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
    },
    secondaryButtonText: resources.NextButtonText,
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH));
    },
  },
});
