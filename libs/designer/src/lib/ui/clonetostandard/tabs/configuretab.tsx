import type { AppDispatch } from '../../../core/state/clonetostandard/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import type { CloneWizardTabProps } from './model';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';
import { ConfigureLogicApps } from '../logicapps/configurelogicapps';

interface ConfigureTabProps extends CloneWizardTabProps {
  onCancel: () => void;
}

export const configureTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { tabStatusIcon, onCancel, isPrimaryButtonDisabled }: ConfigureTabProps
): TemplateTabProps => ({
  id: constants.CLONE_TO_STANDARD_TAB_NAMES.CONFIGURE,
  title: intl.formatMessage({
    defaultMessage: 'Configure',
    id: '6OCUKm',
    description: 'Tab label for configure tab in clone to standard experience',
  }),
  tabStatusIcon,
  content: <ConfigureLogicApps />,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Next',
          id: '0UfxUM',
          description: 'Button text for moving to the next tab in the create workflow panel',
        }),
        appearance: 'primary',
        disabled: isPrimaryButtonDisabled,
        onClick: () => {
          dispatch(selectWizardTab(constants.CLONE_TO_STANDARD_TAB_NAMES.REVIEW));
        },
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Cancel',
          id: 'cMePXi',
          description: 'Button text for exiting the blade in the clone wizard',
        }),
        onClick: onCancel,
      },
    ],
  },
});
