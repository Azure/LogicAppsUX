import { type Template, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { changeCurrentTemplateName, loadTemplate } from '../../../../../core/state/templates/templateSlice';
import { openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';

export const WorkflowPanel: React.FC = () => {
  const { workflowDefinition } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(workflowDefinition) ? null : (
    <div>
      Workflow Tab Placeholder
      <div>Workflow Definition: {JSON.stringify(workflowDefinition)}</div>
    </div>
  );
};

export const workflowTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    templateName,
    templateManifest,
  }: {
    templateName: string | undefined;
    templateManifest: Template.Manifest | undefined;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.WORKFLOW_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Workflow',
    id: 'lFWXhc',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Workflow Tab',
    id: 'SgScU5',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <WorkflowPanel />,
  order: 0,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Create a workflow with this template',
      id: 'wGkH/j',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      dispatch(changeCurrentTemplateName(templateName ?? ''));
      dispatch(loadTemplate(templateManifest));
      dispatch(openCreateWorkflowPanelView());
    },
    primaryButtonDisabled: false,
    onClose: () => {},
  },
});
