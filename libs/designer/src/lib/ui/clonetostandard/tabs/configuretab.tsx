import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { ConfigureLogicApps } from '../logicapps/configurelogicapps';
import type { CloneWizardTabProps } from './model';

export const configureTab = (
  intl: IntlShape,
  { tabStatusIcon, disabled, onClose, onPrimaryButtonClick, isPrimaryButtonDisabled }: CloneWizardTabProps
): TemplateTabProps => ({
  id: constants.CLONE_TO_STANDARD_TAB_NAMES.CONFIGURE,
  title: intl.formatMessage({
    defaultMessage: 'Configure',
    id: '6OCUKm',
    description: 'Tab label for configure tab in clone to standard experience',
  }),
  disabled,
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
        onClick: onPrimaryButtonClick,
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Close',
          id: 'BP+WUL',
          description: 'Button text for exiting the blade in the clone wizard',
        }),
        onClick: onClose,
      },
    ],
  },
});
