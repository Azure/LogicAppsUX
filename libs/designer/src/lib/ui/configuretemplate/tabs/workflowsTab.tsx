import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { useIntl, type IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { CommandBar, type ICommandBarItemProps } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { ConfigureWorkflowsPanel } from '../../panel/configureTemplatePanel/configureWorkflowsPanel/configureWorkflowsPanel';
import { DismissableSuccessToast } from '../toasters';

export const WorkflowsTab = () => {
  const intl = useIntl();
  const { workflows, currentPanelView } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    currentPanelView: state.panel.currentPanelView,
  }));
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });
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
          dispatch(openPanelView({ panelView: TemplatePanelView.ConfigureWorkflows }));
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

  const handleSave = (isMultiWorkflow: boolean) => {
    if (isMultiWorkflow) {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating an accelerator template!",
          id: '3ST5oT',
          description: 'Title for the toaster after adding workflows.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains more than one workflow, therefore it is classified as an Accelerator.',
          id: 'gkUDy6',
          description: 'Content for the toaster for adding workflows',
        }),
        show: true,
      });
    } else {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating a workflow template!",
          id: '7ERTcu',
          description: 'Title for the toaster after adding a single workflow.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains one workflow, therefore it is classified as a Workflow.',
          id: '1AFYij',
          description: 'Content for the toaster for adding a single workflow.',
        }),
        show: true,
      });
    }
  };

  return (
    <div>
      {currentPanelView === TemplatePanelView.ConfigureWorkflows && <ConfigureWorkflowsPanel onSave={handleSave} />}
      <DismissableSuccessToast {...toasterData} />
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
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS,
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
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
    },
  },
});
