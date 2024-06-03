import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';

export const ParametersPanel: React.FC = () => {
  const { parameters, workflowDefinition } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(workflowDefinition) ? null : (
    <div>
      Parameters Tab Placeholder
      {parameters ? <DisplayParameters /> : <>PLACEHOLDER: no parameters</>}
    </div>
  );
};

export const parametersTab = (intl: IntlShape) => ({
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
  content: <ParametersPanel />,
  order: 1,
  icon: 'Info',
});
