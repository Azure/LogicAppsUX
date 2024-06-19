import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';

export const OverviewPanel: React.FC = () => {
  const { manifest } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(manifest) ? null : (
    <div>
      Overview Tab Placeholder
      <div>Manifest Data: {JSON.stringify(manifest)}</div>
    </div>
  );
};

export const overviewTab = (intl: IntlShape, dispatch: AppDispatch) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Overview',
    id: '+YyHKB',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Overview Tab',
    id: 'EJj4E0',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <OverviewPanel />,
  order: 1,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Create a workflow with this template',
      id: 'wGkH/j',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      dispatch(openCreateWorkflowPanelView());
    },
    primaryButtonDisabled: false,
    onClose: () => {
      dispatch(closePanel());
      dispatch(clearTemplateDetails());
    },
  },
});
