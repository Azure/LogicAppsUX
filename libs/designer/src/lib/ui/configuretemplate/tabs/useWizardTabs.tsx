import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { workflowsTab } from './workflowsTab';
import { connectionsTab } from './connectionsTab';
import { parametersTab } from './parametersTab';
import { profileTab } from './profileTab';
import { publishTab } from './publishTab';
import { reviewTab } from './reviewTab';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { useResourceStrings } from '../resources';
import type { Template } from '@microsoft/logic-apps-shared';
import { TemplateResourceService } from '@microsoft/logic-apps-shared';

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

  const {
    enableWizard,
    isWizardUpdating,
    templateManifest,
    state,
    workflows,
    parametersHasError,
    templateManifestHasError,
    runValidation,
  } = useSelector((state: RootState) => ({
    enableWizard: state.tab.enableWizard,
    isWizardUpdating: state.tab.isWizardUpdating,
    runValidation: state.tab.runValidation,
    templateManifest: state.template.manifest,
    state: state.template.status,
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

  const onProfileSave = () => {
    const manifestToUpdate: Template.TemplateManifest = {
      ...(templateManifest as Template.TemplateManifest),
      details: {
        ...templateManifest?.details,
        Type: Object.keys(workflows).length > 1 ? 'Accelerator' : 'Workflow',
      } as any,
    };
    TemplateResourceService().updateTemplate(templateManifest?.id as string, manifestToUpdate, state);
  };
  const disableProfileSave = false;

  return [
    workflowsTab(resources, dispatch, onSaveWorkflows, {
      tabStatusIcon: hasAnyWorkflowErrors ? 'error' : runValidation ? 'success' : 'in-progress',
      disabled: !enableWizard || isWizardUpdating,
    }),
    connectionsTab(intl, resources, dispatch, {
      tabStatusIcon: enableWizard ? 'success' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    parametersTab(resources, dispatch, {
      tabStatusIcon: parametersHasError ? 'error' : enableWizard ? (runValidation ? 'success' : 'in-progress') : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    profileTab(intl, resources, dispatch, {
      tabStatusIcon: templateManifestHasError ? 'error' : runValidation ? 'success' : enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
      onSave: onProfileSave,
      disableSave: disableProfileSave,
    }),
    reviewTab(resources, dispatch, {
      tabStatusIcon: undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    publishTab(intl, resources, dispatch, onPublish, {
      tabStatusIcon: undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
  ];
};
