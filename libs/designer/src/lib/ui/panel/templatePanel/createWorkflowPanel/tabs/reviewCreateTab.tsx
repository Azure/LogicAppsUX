import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import { MessageBar } from '@fluentui/react-components';
import constants from '../../../../../common/constants';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import { ReviewCreatePanel } from '../../../../templates/review/ReviewCreatePanel';

export const reviewCreateTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  onCreateClick: () => void,
  {
    shouldClearDetails,
    isCreating,
    isCreateView,
    errorMessage,
    isPrimaryButtonDisabled,
    previousTabId,
    onClosePanel,
    showCloseButton = true,
    disabled,
  }: {
    errorMessage: string | undefined;
    isPrimaryButtonDisabled: boolean;
    isCreateView: boolean;
  } & CreateWorkflowTabProps
): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.REVIEW_AND_CREATE,
  disabled,
  title: isCreateView
    ? intl.formatMessage({
        defaultMessage: 'Review + create',
        id: 'JQBEOg',
        description: 'The tab label for the monitoring review and create tab on the create workflow panel',
      })
    : intl.formatMessage({
        defaultMessage: 'Review + update',
        id: 'ak6eFQ',
        description: 'The tab label for the review and update tab on the update workflow panel',
      }),
  description: errorMessage ? (
    <MessageBar intent="error">{errorMessage}</MessageBar>
  ) : isCreateView ? (
    intl.formatMessage({
      defaultMessage: 'Review your settings, ensure everything is correctly set up, and create your workflow.',
      id: 'xDHpeS',
      description: 'An accessibility label that describes the objective of review and create tab',
    })
  ) : (
    intl.formatMessage({
      defaultMessage: 'Review your settings, ensure everything is correctly set up, and update your workflow.',
      id: 'RHsEea',
      description: 'An accessibility label that describes the objective of review and update tab',
    })
  ),
  hasError: false,
  content: <ReviewCreatePanel />,
  footerContent: {
    primaryButtonText: isCreating ? (
      <Spinner size={SpinnerSize.xSmall} />
    ) : isCreateView ? (
      intl.formatMessage({
        defaultMessage: 'Create',
        id: '/qrBuJ',
        description: 'Button text for creating the workflow',
      })
    ) : (
      intl.formatMessage({
        defaultMessage: 'Update',
        id: 'thnhGU',
        description: 'Button text for updating the workflow',
      })
    ),
    primaryButtonOnClick: onCreateClick,
    primaryButtonDisabled: isPrimaryButtonDisabled || isCreating,
    secondaryButtonText: previousTabId
      ? intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'Yua/4o',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        })
      : intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
    secondaryButtonOnClick: () => {
      if (previousTabId) {
        dispatch(selectPanelTab(previousTabId));
      } else {
        dispatch(closePanel());

        if (shouldClearDetails) {
          dispatch(clearTemplateDetails());
        }

        onClosePanel?.();
      }
    },
    secondaryButtonDisabled: (!previousTabId && !showCloseButton) || isCreating,
  },
});
