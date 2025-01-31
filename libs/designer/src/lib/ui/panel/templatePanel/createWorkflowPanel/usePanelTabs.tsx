import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { basicsTab } from './tabs/basicsTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import Constants from '../../../../common/constants';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import {
  validateConnections,
  validateWorkflowsBasicInfo,
  validateParameters,
  clearTemplateDetails,
} from '../../../../core/state/templates/templateSlice';
import { LogEntryLevel, LoggerService, Status, TemplateService } from '@microsoft/logic-apps-shared';
import { useMutation } from '@tanstack/react-query';
import type { CreateWorkflowHandler } from '../../../templates';
import { closePanel } from '../../../../core/state/templates/panelSlice';

export const useCreateWorkflowPanelTabs = ({
  isMultiWorkflowTemplate,
  createWorkflow,
}: { createWorkflow: CreateWorkflowHandler; isMultiWorkflowTemplate: boolean }): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const {
    connections,
    existingWorkflowName,
    selectedTabId,
    templateName,
    workflowAppName,
    isConsumption,
    parameterDefinitions,
    errors: { parameters: parameterErrors, connections: connectionsError },
    templateConnections,
    workflows,
    isCreateView,
  } = useSelector((state: RootState) => ({
    existingWorkflowName: state.workflow.existingWorkflowName,
    connections: state.workflow.connections,
    workflowAppName: state.workflow.workflowAppName,
    isConsumption: state.workflow.isConsumption,
    selectedTabId: state.panel.selectedTabId,
    templateName: state.template.templateName,
    parameterDefinitions: state.template.parameterDefinitions,
    errors: state.template.errors,
    templateConnections: state.template.connections,
    workflows: state.template.workflows,
    isCreateView: state.workflow.isCreateView,
  }));

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const connectionsExist = useMemo(() => Object.keys(templateConnections).length > 0, [templateConnections]);
  const parametersExist = useMemo(() => Object.keys(parameterDefinitions).length > 0, [parameterDefinitions]);
  const hasParametersValidationErrors = useMemo(() => Object.values(parameterErrors).some((error) => !!error), [parameterErrors]);

  // Validation user inputs based on the selected tab.
  useEffect(() => {
    if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS) {
      dispatch(validateConnections(connections.mapping));
    } else if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE) {
      dispatch(validateConnections(connections.mapping));
      dispatch(validateParameters());
    }
    if (!isConsumption && selectedTabId && selectedTabId !== Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC) {
      dispatch(validateWorkflowsBasicInfo({ validateName: !existingWorkflowName, existingNames: existingWorkflowNames ?? [] }));
    }
  }, [dispatch, isConsumption, existingWorkflowName, existingWorkflowNames, parametersExist, selectedTabId, connections.mapping]);

  const onCreateClick = useCallback(async () => {
    const resources = {
      singleMissingInfo: intl.formatMessage({
        defaultMessage: 'Missing information for workflow creation',
        id: 'wBBu4g',
        description: 'Error message when missing information for workflow creation',
      }),
      multiMissingInfo: intl.formatMessage({
        defaultMessage: 'Missing information for workflows creation',
        id: 'rHySVF',
        description: 'Error message when missing information for workflows creation',
      }),
    };

    const isMissingWorkflowInfo = Object.values(workflows).some(
      (workflowData) =>
        (!isConsumption && (!workflowData.workflowName || workflowData.errors.kind)) ||
        workflowData.errors.workflow ||
        !workflowData.workflowDefinition
    );

    const isMissingInfo = isMissingWorkflowInfo || connectionsError || Object.values(parameterErrors)?.filter((error) => error).length > 0;

    if (isMissingInfo) {
      throw new Error(isMultiWorkflowTemplate ? resources.multiMissingInfo : resources.singleMissingInfo);
    }

    await createWorkflow(
      Object.values(workflows).map((data) => ({
        id: data.id,
        name: data.workflowName as string,
        kind: data.kind as string,
        definition: data.workflowDefinition as any,
      })),
      connections,
      parameterDefinitions
    );
  }, [
    isConsumption,
    connections,
    connectionsError,
    createWorkflow,
    intl,
    isMultiWorkflowTemplate,
    parameterDefinitions,
    parameterErrors,
    workflows,
  ]);

  const { isLoading: isCreating, mutate: createWorkflowFromTemplate } = useMutation(async () => {
    setErrorMessage(undefined);
    const logId = LoggerService().startTrace({
      name: isMultiWorkflowTemplate ? 'Create Workflows from Accelerator Template' : 'Create Workflow from Template',
      action: isMultiWorkflowTemplate ? 'createMultiWorkflowsFromTemplate' : 'createWorkflowFromTemplate',
      source: 'Templates.createTab',
    });
    try {
      await onCreateClick();
      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'Templates.createTab',
        message: isMultiWorkflowTemplate ? 'Multi workflows template is created' : 'Template is created',
        args: [templateName, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflowTemplate}`],
      });
      LoggerService().endTrace(logId, { status: Status.Success });

      dispatch(closePanel());
      dispatch(clearTemplateDetails());

      TemplateService()?.openBladeAfterCreate(isMultiWorkflowTemplate ? undefined : (Object.values(workflows)[0].workflowName as string));
    } catch (e: any) {
      setErrorMessage(e.message);
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'Templates.createTab',
        message: e.message,
        error: e instanceof Error ? e : undefined,
        args: [templateName, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflowTemplate}`],
      });
      LoggerService().endTrace(logId, { status: Status.Failure });
    }
  });

  const nameStateTabItem = useMemo(
    () => ({
      ...basicsTab(intl, dispatch, {
        shouldClearDetails: !isMultiWorkflowTemplate,
        nextTabId: connectionsExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
          : parametersExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
            : Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
        hasError: Object.values(workflows).some((workflowData) => workflowData.errors.kind || workflowData.errors.workflow),
        isCreating,
      }),
    }),
    [intl, dispatch, isMultiWorkflowTemplate, connectionsExist, parametersExist, workflows, isCreating]
  );

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch, {
        shouldClearDetails: !isMultiWorkflowTemplate,
        previousTabId: isConsumption ? undefined : Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
        nextTabId: parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
        hasError: !!connectionsError,
        isCreating,
      }),
    }),
    [intl, dispatch, isMultiWorkflowTemplate, isConsumption, isCreating, connectionsError, parametersExist]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch, {
        shouldClearDetails: !isMultiWorkflowTemplate,
        previousTabId: connectionsExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
          : isConsumption
            ? undefined
            : Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
        hasError: hasParametersValidationErrors,
        isCreating,
      }),
    }),
    [intl, dispatch, isMultiWorkflowTemplate, isConsumption, isCreating, hasParametersValidationErrors, connectionsExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, createWorkflowFromTemplate, {
        shouldClearDetails: !isMultiWorkflowTemplate,
        isCreating,
        isCreateView,
        errorMessage,
        hasError: false,
        isPrimaryButtonDisabled: nameStateTabItem.hasError || !!connectionsError || hasParametersValidationErrors,
        previousTabId: parametersExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
          : connectionsExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
            : isConsumption
              ? undefined
              : Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
      }),
    }),
    [
      intl,
      dispatch,
      createWorkflowFromTemplate,
      isMultiWorkflowTemplate,
      isCreating,
      isCreateView,
      errorMessage,
      nameStateTabItem.hasError,
      connectionsError,
      hasParametersValidationErrors,
      parametersExist,
      connectionsExist,
      isConsumption,
    ]
  );

  const tabs = useMemo(() => {
    const validTabs = [];
    if (!isConsumption) {
      validTabs.push(nameStateTabItem);
    }
    if (connectionsExist) {
      validTabs.push(connectionsTabItem);
    }
    if (parametersExist) {
      validTabs.push(parametersTabItem);
    }
    validTabs.push(reviewCreateTabItem);
    return validTabs;
  }, [isConsumption, connectionsExist, parametersExist, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
