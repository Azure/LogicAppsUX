import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { TemplateParametersList } from '../parameters/parameterslist';
import type { TemplateWizardTabProps } from './model';

export const parametersTab = (
  resources: Record<string, string>,
  dispatch: AppDispatch,
  { disabled, tabStatusIcon }: TemplateWizardTabProps
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PARAMETERS,
  title: resources.ParametersTabLabel,
  tabStatusIcon,
  disabled,
  content: <TemplateParametersList />,
  footerContent: {
    buttonContents: [
      {
        type: 'button',
        text: resources.PreviousButtonText,
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
        },
      },
      {
        type: 'button',
        text: resources.NextButtonText,
        appreance: 'primary',
        onClick: () => {
          dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE));
        },
      },
    ],
  },
});
