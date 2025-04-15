import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
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

  const { enableWizard, isWizardUpdating } = useSelector((state: RootState) => ({
    enableWizard: state.tab.enableWizard,
    isWizardUpdating: state.tab.isWizardUpdating,
  }));

  return [
    workflowsTab(resources, dispatch, onSaveWorkflows, {
      tabStatusIcon: 'in-progress',
    }),
    connectionsTab(intl, resources, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    parametersTab(resources, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    profileTab(resources, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    publishTab(intl, resources, dispatch, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    reviewPublishTab(intl, resources, dispatch, onPublish, {
      tabStatusIcon: enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
  ];
};
