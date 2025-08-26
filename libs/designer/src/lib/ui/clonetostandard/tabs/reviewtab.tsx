import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import type { CloneWizardTabProps } from './model';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';

interface ConfigureTabProps extends CloneWizardTabProps {
  onClone: () => Promise<void>;
}

export const reviewTab = (intl: IntlShape, dispatch: AppDispatch, { tabStatusIcon, onClone }: ConfigureTabProps): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PROFILE,
  title: intl.formatMessage({
    defaultMessage: 'Configure',
    id: '6OCUKm',
    description: 'Tab label for configure tab in clone to standard experience',
  }),
  tabStatusIcon,
  content: <div />,
  footerContent: {
    buttonContents: [
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Clone',
          id: 'p0BE2D',
          description: 'Button text to trigger clone in the create workflow panel',
        }),
        appearance: 'primary',
        onClick: onClone,
      },
      {
        type: 'navigation',
        text: intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'kuzT1s',
          description: 'Button text for moving back to configure tab in the clone wizard',
        }),
        onClick: () => {
          dispatch(selectWizardTab(constants.CLONE_TO_STANDARD_TAB_NAMES.CONFIGURE));
        },
      },
    ],
  },
});
