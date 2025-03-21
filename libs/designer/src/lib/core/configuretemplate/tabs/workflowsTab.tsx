import type { AppDispatch, RootState } from '../../state/templates/store';
import { useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import type { IntlShape } from 'react-intl';
import { selectWizardTab } from 'lib/core/state/templates/tabSlice';

export const WorkflowsTab = () => {
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
  }));

  return Object.keys(workflows).length > 0 ? (
    Object.values(workflows).map((workflowData) => <Text key={workflowData.id}>{workflowData.id}</Text>)
  ) : (
    <Text>placeholder - add workflows</Text>
  );
};

export const workflowsTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Workflows',
    id: 'R7VvvJ',
    description: 'The tab label for the monitoring workflows tab on the configure template wizard',
  }),
  hasError: false,
  content: <WorkflowsTab />,
  footerContent: {
    primaryButtonText: '',
    primaryButtonOnClick: () => {},
    showPrimaryButton: false,
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.TEMPLATE_TAB_NAMES.CONNECTIONS));
    },
  },
});
