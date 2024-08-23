import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';

export const ParametersPanel: React.FC = () => {
  return <DisplayParameters />;
};

export const parametersTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isCreating, previousTabId, hasError }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'xi2tn6',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'You can edit parameters here or in designer.',
    id: 'oxCSqB',
    description: 'An accessibility label that describes the objective of parameters tab',
  }),
  hasError: hasError,
  content: <ParametersPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Previous',
      id: 'Yua/4o',
      description: 'Button text for moving to the previous tab in the create workflow panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectPanelTab(previousTabId));
    },
    secondaryButtonDisabled: isCreating,
  },
});
