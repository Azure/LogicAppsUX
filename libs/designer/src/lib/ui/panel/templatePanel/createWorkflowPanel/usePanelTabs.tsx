import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import Constants from '../../../../common/constants';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import {
  validateConnections,
  validateKind,
  validateParameters,
  validateWorkflowName,
} from '../../../../core/state/templates/templateSlice';
import { LogEntryLevel, LoggerService, Status } from '@microsoft/logic-apps-shared';
import { useMutation } from '@tanstack/react-query';

export const useCreateWorkflowPanelTabs = ({ onCreateClick }: { onCreateClick: () => Promise<void> }): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const {
    errors: { workflow: workflowError, kind: kindError, parameters: parameterErrors, connections: connectionsError },
    workflowName,
    kind,
    manifest: selectedManifest,
  } = useSelector((state: RootState) => state.template);
  const { mapping, selectedTabId, templateName, workflowAppName } = useSelector((state: RootState) => ({
    mapping: state.workflow.connections.mapping,
    selectedTabId: state.panel.selectedTabId,
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
  }));

  const [isCreated, setIsCreated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const connectionsExist = useMemo(() => selectedManifest && Object.keys(selectedManifest?.connections).length > 0, [selectedManifest]);
  const parametersExist = useMemo(() => selectedManifest && selectedManifest.parameters.length > 0, [selectedManifest]);
  const hasParametersValidationErrors = useMemo(() => Object.values(parameterErrors).some((error) => !!error), [parameterErrors]);

  useEffect(() => {
    setIsCreated(false);
  }, [selectedManifest]);

  useEffect(() => {
    if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS) {
      dispatch(validateConnections(mapping));
    } else if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE) {
      dispatch(validateConnections(mapping));
      dispatch(validateParameters());
    }
    if (selectedTabId !== Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC) {
      if (!existingWorkflowName) {
        dispatch(validateWorkflowName(existingWorkflowNames ?? []));
      }
      dispatch(validateKind());
    }
  }, [dispatch, mapping, existingWorkflowName, existingWorkflowNames, parametersExist, selectedTabId, kind]);

  const { isLoading: isCreating, mutate: createWorkflowFromTemplate } = useMutation(async () => {
    setErrorMessage(undefined);
    const logId = LoggerService().startTrace({
      name: 'Create Workflow from Template',
      action: 'createWorkflowFromTemplate',
      source: 'CreateTabs',
    });
    try {
      await onCreateClick();
      setIsCreated(true);
      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'Templates.createTab',
        message: 'Template is created',
        args: [templateName, workflowAppName],
      });
      LoggerService().endTrace(logId, { status: Status.Success });
    } catch (e: any) {
      setErrorMessage(e.message);
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'Templates.createTab',
        message: e.message,
        error: e instanceof Error ? e : undefined,
        args: [templateName, workflowAppName],
      });
      LoggerService().endTrace(logId, { status: Status.Failure });
    }
  });

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch, {
        nextTabId: connectionsExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
          : parametersExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
            : Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
        hasError: !!workflowError || !!kindError,
        isCreating,
      }),
    }),
    [intl, dispatch, workflowError, kindError, connectionsExist, parametersExist]
  );

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch, {
        nextTabId: parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
        hasError: !!connectionsError,
        isCreating,
      }),
    }),
    [intl, dispatch, isCreating, connectionsError, parametersExist]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch, {
        previousTabId: connectionsExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS : Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
        hasError: hasParametersValidationErrors,
        isCreating,
      }),
    }),
    [intl, dispatch, isCreating, hasParametersValidationErrors, connectionsExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, createWorkflowFromTemplate, {
        workflowName: existingWorkflowName ?? workflowName ?? '',
        isCreating,
        isCreated,
        errorMessage,
        isPrimaryButtonDisabled: !!workflowError || !kind || !!connectionsError || hasParametersValidationErrors,
        previousTabId: parametersExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
          : connectionsExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
            : Constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
      }),
    }),
    [
      intl,
      dispatch,
      createWorkflowFromTemplate,
      existingWorkflowName,
      workflowName,
      isCreating,
      workflowError,
      kind,
      isCreated,
      errorMessage,
      connectionsError,
      hasParametersValidationErrors,
      connectionsExist,
      parametersExist,
    ]
  );

  const tabs = useMemo(() => {
    const validTabs = [];
    validTabs.push(nameStateTabItem);
    if (connectionsExist) {
      validTabs.push(connectionsTabItem);
    }
    if (parametersExist) {
      validTabs.push(parametersTabItem);
    }
    validTabs.push(reviewCreateTabItem);
    return validTabs;
  }, [connectionsExist, parametersExist, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
