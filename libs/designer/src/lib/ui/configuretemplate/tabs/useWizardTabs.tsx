import type { AppDispatch } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
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

  return [
    workflowsTab(intl, dispatch, onSaveWorkflows),
    connectionsTab(intl, dispatch),
    parametersTab(intl, dispatch),
    profileTab(intl, dispatch),
    publishTab(intl, dispatch),
    reviewPublishTab(intl, dispatch, onPublish),
  ];
};
