import type { AppDispatch } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { workflowsTab } from './workflowsTab';
import { connectionsTab } from './connectionsTab';
import { parametersTab } from './parametersTab';
import { profileTab } from './profileTab';
import { publishTab } from './publishTab';
import { reviewPublishTab } from './reviewPublishTab';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { useResourceStrings } from '../resources';

export const useConfigureTemplateWizardTabs = ({
  onSaveWorkflows,
  onPublish,
}: {
  onSaveWorkflows: (isMultiWorkflow: boolean) => void;
  onPublish: () => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const resources = { ...useTemplatesStrings().tabLabelStrings, ...useResourceStrings() };

  return [
    workflowsTab(resources, dispatch, onSaveWorkflows),
    connectionsTab(intl, resources, dispatch),
    parametersTab(resources, dispatch),
    profileTab(resources, dispatch),
    publishTab(intl, resources, dispatch),
    reviewPublishTab(intl, resources, dispatch, onPublish),
  ];
};
