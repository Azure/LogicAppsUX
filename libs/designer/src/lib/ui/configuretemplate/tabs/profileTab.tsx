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
  { disabled, tabStatusIcon, onSave, disableSave }: TemplateWizardTabProps & { onSave: () => void; disableSave: boolean }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE,
  title: resources.ProfileTabLabel,
  tabStatusIcon,
  disabled,
  content: <TemplateManifestForm />,
  footerContent: {
    buttonContents: [
      {
        type: 'button',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
        },
      },
      {
        type: 'button',
        text: resources.NextButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW));
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'button',
        text: intl.formatMessage({
          defaultMessage: 'Save',
          id: 'GGmFte',
          description: 'The description for saving the profile tab content to the service provider',
        }),
        appreance: 'primary',
        onClick: onSave,
        disabled: disableSave,
      },
    ],
    primaryButtonText: resources.PreviousButtonText,
    primaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS));
    },
    secondaryButtonText: resources.NextButtonText,
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW));
    },
    thirdButtonText: intl.formatMessage({
      defaultMessage: 'Save',
      id: 'GGmFte',
      description: 'The description for saving the profile tab content to the service provider',
    }),
    thirdButtonOnClick: onSave,
    thirdButtonDisabled: disableSave,
  },
});
