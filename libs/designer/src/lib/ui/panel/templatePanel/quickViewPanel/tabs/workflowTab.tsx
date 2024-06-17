import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const WorkflowPanel: React.FC = () => {
  const { workflowDefinition } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(workflowDefinition) ? null : (
    <div>
      Workflow Tab Placeholder
      <div>Workflow Definition: {JSON.stringify(workflowDefinition)}</div>
    </div>
  );
};

export const workflowTab = (intl: IntlShape, dispatch: AppDispatch): TemplatePanelTab => ({
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
    primaryButtonText: 'Next',
    primaryButtonOnClick: () => {
      //TODO: revisit. if parameters is invisible, we should skip to the next visible tab
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS));
    },
    primaryButtonDisabled: false,
    onClose: () => {},
  },
});
