import type { AppDispatch } from '../../../core/state/templates/store';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import type { CloneWizardTabProps } from './model';
import { selectWizardTab } from '../../../core/state/clonetostandard/tabslice';
import { CloneReviewList } from '../review/clonereviewlist';

interface ReviewTabProps extends CloneWizardTabProps {
  onClone: () => Promise<void>;
}

export const reviewTab = (intl: IntlShape, dispatch: AppDispatch, { tabStatusIcon, onClone }: ReviewTabProps): TemplateTabProps => ({
  id: constants.CLONE_TO_STANDARD_TAB_NAMES.REVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Review',
    id: '944VBM',
    description: 'Tab label for review tab in clone to standard experience',
  }),
  tabStatusIcon,
  content: <CloneReviewList />,
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
