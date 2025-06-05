import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { workflowsTab } from './workflowsTab';
import { connectionsTab } from './connectionsTab';
import { parametersTab } from './parametersTab';
import { profileTab } from './profileTab';
import { summaryTab } from './summaryTab';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { useResourceStrings } from '../resources';
import { setRunValidation } from '../../../core/state/templates/tabSlice';
import {
  setApiValidationErrors,
  updateEnvironment,
  validateParameterDetails,
  validateTemplateManifest,
  validateWorkflowManifestsData,
} from '../../../core/state/templates/templateSlice';
import constants from '../../../common/constants';
import type { Template } from '@microsoft/logic-apps-shared';
import { isUndefinedOrEmptyString, TemplateResourceService } from '@microsoft/logic-apps-shared';
import { useEffect, useCallback } from 'react';
import { getZippedTemplateForDownload } from '../../../core/configuretemplate/utils/helper';
import { getTemplateValidationError } from '../../../core/actions/bjsworkflow/configuretemplate';
import { resetTemplateQuery } from '../../../core/configuretemplate/utils/queries';

export const useConfigureTemplateWizardTabs = ({
  onSaveWorkflows,
  onSaveTemplate,
}: {
  onSaveWorkflows: (isMultiWorkflow: boolean) => void;
  onSaveTemplate: (prevStatus: Template.TemplateEnvironment, newStatus: Template.TemplateEnvironment) => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const resources = { ...useTemplatesStrings().tabLabelStrings, ...useResourceStrings() };

  const {
    enableWizard,
    isWizardUpdating,
    templateManifest,
    currentState,
    workflows,
    parametersHasError,
    templateManifestHasError,
    runValidation,
    selectedTabId,
    connections,
    parameterDefinitions,
  } = useSelector((state: RootState) => ({
    enableWizard: state.tab.enableWizard,
    isWizardUpdating: state.tab.isWizardUpdating,
    runValidation: state.tab.runValidation,
    templateManifest: state.template.manifest,
    currentState: state.template.status,
    workflows: state.template.workflows,
    parametersHasError: Object.values(state.template.errors.parameters).some((value) => value !== undefined),
    templateManifestHasError:
      state.template.errors.general || Object.values(state.template.errors.manifest).some((value) => value !== undefined),
    selectedTabId: state.tab.selectedTabId,
    connections: state.template.connections,
    parameterDefinitions: state.template.parameterDefinitions,
  }));

  const hasAnyWorkflowErrors = Object.values(workflows).some(
    ({ errors }) =>
      !!errors?.workflow ||
      !!errors?.kind ||
      (errors?.manifest && Object.values(errors?.manifest ?? {}).some((value) => value !== undefined))
  );

  useEffect(() => {
    if (selectedTabId === constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SUMMARY) {
      dispatch(setRunValidation(true));
      dispatch(validateWorkflowManifestsData());
      dispatch(validateTemplateManifest());
      dispatch(validateParameterDetails());
    }
  }, [dispatch, selectedTabId]);

  const handleSaveTemplate = useCallback(
    async (newPublishState: Template.TemplateEnvironment) => {
      const service = TemplateResourceService();

      dispatch(setRunValidation(true));
      const templateId = templateManifest?.id as string;

      try {
        const isSingleWorkflow = Object.keys(workflows).length === 1;
        if (isSingleWorkflow) {
          await service.updateWorkflow(templateId, Object.values(workflows)[0]?.id, {
            title: templateManifest?.title,
            summary: templateManifest?.summary,
          });
        }
        await service.updateTemplate(templateId, templateManifest, newPublishState);
        resetTemplateQuery(templateId);
        dispatch(setApiValidationErrors({ error: undefined, source: 'template' }));
        onSaveTemplate(currentState as Template.TemplateEnvironment, newPublishState);
        dispatch(updateEnvironment(newPublishState));
      } catch (error: any) {
        dispatch(getTemplateValidationError({ errorResponse: error, source: 'template' }));
      }
    },
    [workflows, templateManifest, onSaveTemplate, currentState, dispatch]
  );

  const downloadTemplate = useCallback(async () => {
    await getZippedTemplateForDownload(templateManifest as Template.TemplateManifest, workflows, connections, parameterDefinitions);
  }, [connections, parameterDefinitions, templateManifest, workflows]);

  const isDisplayNameEmpty = isUndefinedOrEmptyString(templateManifest?.title);

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
      status: currentState,
      onSave: handleSaveTemplate,
      isSaveButtonDisabled: isDisplayNameEmpty,
    }),
    summaryTab(resources, dispatch, {
      tabStatusIcon: undefined,
      disabled: !enableWizard || isWizardUpdating,
      status: currentState,
      onSave: handleSaveTemplate,
      onDownloadTemplate: downloadTemplate,
    }),
  ];
};
