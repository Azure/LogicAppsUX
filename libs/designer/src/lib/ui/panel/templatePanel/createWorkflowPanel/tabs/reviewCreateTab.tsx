import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import { Spinner } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';

export const ReviewCreatePanel = () => {
  return <></>;
};

export const reviewCreateTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  onCreateClick: () => Promise<void>,
  {
    isLoading,
    isButtonDisabled,
  }: {
    isLoading: boolean;
    isButtonDisabled: boolean;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
  title: intl.formatMessage({
    defaultMessage: 'Review and Create',
    id: 'vlWl7f',
    description: 'The tab label for the monitoring review and create tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Review your settings, ensure everything is correctly set up, and create your workflow.',
    id: 'BPSraP',
    description: 'An accessability label that describes the objective of review and create tab',
  }),
  visible: true,
  order: 3,
  content: <ReviewCreatePanel />,
  footerContent: {
    primaryButtonText: isLoading ? (
      <Spinner size="extra-tiny" />
    ) : (
      intl.formatMessage({
        defaultMessage: 'Create',
        id: '/qrBuJ',
        description: 'Button text for creating the workflow',
      })
    ),
    primaryButtonOnClick: onCreateClick,
    primaryButtonDisabled: isButtonDisabled || isLoading,
  },
});
