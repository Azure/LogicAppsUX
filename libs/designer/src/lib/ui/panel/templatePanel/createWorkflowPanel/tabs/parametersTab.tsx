import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { clearTemplateDetails, validateParameters } from '../../../../../core/state/templates/templateSlice';

export const ParametersPanel: React.FC = () => {
  return <DisplayParameters />;
};

export const parametersTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    previousTabId,
    hasError,
  }: {
    previousTabId: string | undefined;
    hasError: boolean;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'xi2tn6',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage:
      'Parameters are values that can be reused throughout your workflows, enabling greater flexibility and easier maintenance. By using parameters, you can simplify workflow modifications and ensure consistency across your automation processes. The parameters will be saved when the workflow is created. You can edit parameters here or in designer.',
    id: 'oG8Tky',
    description: 'An accessability label that describes the objective of parameters tab',
  }),
  hasError: hasError,
  order: 1,
  content: <ParametersPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(validateParameters());
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE));
    },
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
    secondaryButtonOnClick: previousTabId
      ? () => {
          dispatch(selectPanelTab(previousTabId));
        }
      : () => {
          dispatch(closePanel());
          dispatch(clearTemplateDetails());
        },
  },
});
