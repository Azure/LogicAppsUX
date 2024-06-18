import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState, AppDispatch } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const ParametersPanel: React.FC = () => {
  const { parameters } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(parameters) ? null : <DisplayParameters />;
};

export const parametersTab = (intl: IntlShape, dispatch: AppDispatch): TemplatePanelTab => ({
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
    primaryButtonText: 'Next',
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE));
    },
    primaryButtonDisabled: false,
  },
});
