import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayParameters } from '../../../../templates/parameters/displayParameters';
import { Text } from '@fluentui/react-components';

export const ParametersPanel: React.FC = () => {
  const { parameters } = useSelector((state: RootState) => state.template);
  const intl = useIntl();

  const parametersDescription = intl.formatMessage({
    defaultMessage:
      'Parameters are values that can be reused throughout your workflows, enabling greater flexibility and easier maintenance. By using parameters, you can simplify workflow modifications and ensure consistency across your automation processes. The parameters will be saved when the workflow is created. You can edit parameters here or in designer.',
    id: 'owD+2q',
    description: 'Descriptions for explaining what parameters are and what they do',
  });

  return isNullOrUndefined(parameters) ? null : (
    <div>
      <div className="todo">
        <Text className="todo">{parametersDescription}</Text>
      </div>
      <DisplayParameters />
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
