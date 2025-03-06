import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';

export const ParametersPanel: React.FC = () => {
  return <DisplayParameters />;
};

export const parametersTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isCreating, shouldClearDetails, previousTabId, hasError, onClosePanel, showCloseButton = true }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'c62dad9fabab',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'You can edit parameters here or in designer.',
    id: 'a31092a810c9',
    description: 'An accessibility label that describes the objective of parameters tab',
  }),
  hasError: hasError,
  content: <ParametersPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'd147f150cc64',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
    },
    secondaryButtonText: previousTabId
      ? intl.formatMessage({
          defaultMessage: 'Previous',
          id: '62e6bfe282ce',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        })
      : intl.formatMessage({
          defaultMessage: 'Close',
          id: '153accc4d1cf',
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
