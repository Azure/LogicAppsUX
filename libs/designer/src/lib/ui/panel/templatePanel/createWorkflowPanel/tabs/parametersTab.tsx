import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { validateParameters } from '../../../../../core/state/templates/templateSlice';

export const ParametersPanel: React.FC = () => {
  return <DisplayParameters />;
};

export const parametersTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  hasParametersValidationErrors: boolean,
  missingRequiredParameters: boolean
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'xi2tn6',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Parameters Tab',
    id: 'dcpRnG',
    description: 'An accessability label that describes the parameters tab',
  }),
  visible: true,
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
      if (!missingRequiredParameters && !hasParametersValidationErrors) {
        dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE));
      }
    },
    primaryButtonDisabled: hasParametersValidationErrors,
  },
});
