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
import { useEffect } from 'react';
import { setRunValidation } from '../../../core/state/templates/tabSlice';
import {
  validateParameterDetails,
  validateTemplateManifest,
  validateWorkflowManifestsData,
} from '../../../core/state/templates/templateSlice';
import constants from '../../../common/constants';

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

  const { selectedTabId, enableWizard, isWizardUpdating, workflows, parametersHasError, templateManifestHasError, runValidation } =
    useSelector((state: RootState) => ({
      selectedTabId: state.tab.selectedTabId,
      enableWizard: state.tab.enableWizard,
      isWizardUpdating: state.tab.isWizardUpdating,
      runValidation: state.tab.runValidation,
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

  useEffect(() => {
    if (
      selectedTabId === constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.REVIEW ||
      selectedTabId === constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.PUBLISH
    ) {
      dispatch(setRunValidation(true));
      dispatch(validateWorkflowManifestsData());
      dispatch(validateTemplateManifest());
      dispatch(validateParameterDetails());
    }
  }, [dispatch, selectedTabId]);

  return [
    workflowsTab(resources, dispatch, onSaveWorkflows, {
      tabStatusIcon: hasAnyWorkflowErrors ? 'error' : runValidation ? 'success' : 'in-progress',
    }),
    connectionsTab(intl, resources, dispatch, {
      tabStatusIcon: enableWizard ? 'success' : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    parametersTab(resources, dispatch, {
      tabStatusIcon: parametersHasError ? 'error' : enableWizard ? (runValidation ? 'success' : 'in-progress') : undefined,
      disabled: !enableWizard || isWizardUpdating,
    }),
    profileTab(resources, dispatch, {
      tabStatusIcon: templateManifestHasError ? 'error' : runValidation ? 'success' : enableWizard ? 'in-progress' : undefined,
      disabled: !enableWizard || isWizardUpdating,
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
