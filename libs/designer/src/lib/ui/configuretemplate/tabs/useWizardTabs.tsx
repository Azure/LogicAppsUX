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

  const { enableWizard, isWizardUpdating, workflows, parametersHasError, templateManifestHasError } = useSelector((state: RootState) => ({
    enableWizard: state.tab.enableWizard,
    isWizardUpdating: state.tab.isWizardUpdating,
    workflows: state.template.workflows,
    parametersHasError: Object.values(state.template.errors.parameters).some((value) => value !== undefined),
    templateManifestHasError: Object.values(state.template.errors.manifest).some((value) => value !== undefined),
  }));

  const hasAnyWorkflowErrors = Object.values(workflows).some(
    ({ errors }) =>
      !!errors?.workflow ||
      !!errors?.kind ||
      (errors?.manifest && Object.values(errors?.manifest ?? {}).some((value) => value !== undefined))
  );

  // Add flag - runValidation to true when we want to run validation on the workflow data

  return [
    workflowsTab(resources, dispatch, onSaveWorkflows, {
      tabStatusIcon: hasAnyWorkflowErrors ? 'error' : 'in-progress',
    }),
    connectionsTab(intl, resources, dispatch, {
      tabStatusIcon: enableWizard ? 'success' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    parametersTab(resources, dispatch, {
      tabStatusIcon: parametersHasError ? 'error' : enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    profileTab(resources, dispatch, {
      tabStatusIcon: templateManifestHasError ? 'error' : enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    publishTab(intl, resources, dispatch, {
      tabStatusIcon: undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    reviewPublishTab(intl, resources, dispatch, onPublish, {
      tabStatusIcon: undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
  ];
};
