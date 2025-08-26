import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateManifestForm } from '../templateprofile/manifestform';
import type { TemplateWizardTabProps } from './model';
import type { IntlShape } from 'react-intl';

export const profileTab = (
  intl: IntlShape,
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon, onSave, isSaveButtonDisabled }: TemplateWizardTabProps & { isSaveButtonDisabled: boolean }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE,
  title: resources.ProfileTabLabel,
  tabStatusIcon,
  disabled,
  content: <TemplateManifestForm />,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
        },
      },
      {
        type: 'navigation',
        text: resources.NextButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SUMMARY));
        },
      },
      {
        type: 'action',
        text: resources.SaveButtonText,
        appearance: 'primary',
        onClick: () => onSave?.(),
        disabled: isSaveButtonDisabled,
      },
    ],
  },
});
