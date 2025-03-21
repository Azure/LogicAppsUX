import type { AppDispatch, RootState } from '../../state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { useIntl, type IntlShape } from 'react-intl';
import { selectWizardTab } from '../../state/templates/tabSlice';
import { CommandBar, type ICommandBarItemProps } from '@fluentui/react';
import { useMemo } from 'react';
import { openConfigureWorkflowPanelView } from '../../state/templates/panelSlice';
import { ConfigureWorkflowsPanel } from '../../../ui/panel/configureTemplatePanel/configureWorkflowsPanel/configureWorkflowsPanel';

export const WorkflowsTab = () => {
  const intl = useIntl();
  const { workflows } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
  }));
  const dispatch = useDispatch<AppDispatch>();

  const commandBarItems: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'add',
        text: intl.formatMessage({
          defaultMessage: 'Add workflows',
          id: 'Ve6uLm',
          description: 'Button text for opening panel for adding workflows',
        }),
        iconProps: { iconName: 'Add' },
        onClick: () => {
          dispatch(openConfigureWorkflowPanelView());
        },
      },
      {
        key: 'delete',
        text: intl.formatMessage({
          defaultMessage: 'Delete',
          id: 'Ld62T8',
          description: 'Button text for deleting selected workflows',
        }),
        iconProps: { iconName: 'Trash' },
        onClick: () => {
          //todo remove selected workflows
        },
      },
    ],
    [intl, dispatch]
  );

  return (
    <div>
      <ConfigureWorkflowsPanel />

      <CommandBar
        items={commandBarItems}
        styles={{
          root: {
            borderBottom: `1px solid ${'#333333'}`,
            position: 'relative',
            padding: '4px 8px',
          },
        }}
      />

      {Object.keys(workflows).length > 0 ? (
        Object.values(workflows).map((workflowData) => <Text key={workflowData.id}>{workflowData.id}</Text>)
      ) : (
        <Text>placeholder - add workflows</Text>
      )}
    </div>
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
