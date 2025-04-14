import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { workflowsTab } from './workflowsTab';
import { connectionsTab } from './connectionsTab';
import { parametersTab } from './parametersTab';
import { profileTab } from './profileTab';
import { publishTab } from './publishTab';
import { reviewPublishTab } from './reviewPublishTab';

export const useConfigureTemplateWizardTabs = ({
  onSaveWorkflows,
  onPublish,
}: {
  onSaveWorkflows: (isMultiWorkflow: boolean) => void;
  onPublish: () => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const { enableWizard, isWizardUpdating } = useSelector((state: RootState) => ({
    enableWizard: state.tab.enableWizard,
    isWizardUpdating: state.tab.isWizardUpdating,
  }));

  return [
    workflowsTab(intl, dispatch, onSaveWorkflows, {
      tabStatusIcon: 'in-progress',
    }),
    connectionsTab(intl, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    parametersTab(intl, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    profileTab(intl, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    publishTab(intl, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    reviewPublishTab(intl, dispatch, onPublish, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
  ];
};
