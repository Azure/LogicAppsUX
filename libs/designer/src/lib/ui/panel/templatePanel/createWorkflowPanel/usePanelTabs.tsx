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
    if (parametersExist && selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS) {
      dispatch(validateConnections(mapping));
    } else if (
      selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE ||
      selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE
    ) {
      dispatch(validateConnections(mapping));
      dispatch(validateParameters());
      if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE) {
        if (!existingWorkflowName) {
          dispatch(validateWorkflowName(existingWorkflowNames ?? []));
        }
        dispatch(validateKind());
      }
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
        area: 'Templates.usePanelTabs',
        message: 'Template is created',
        args: [templateName, workflowAppName],
      });
      LoggerService().endTrace(logId, { status: Status.Success });
    } catch (e: any) {
      setErrorMessage(e.message);
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'Templates.usePanelTabs',
        message: e.message,
        error: e instanceof Error ? e : undefined,
        args: [templateName, workflowAppName],
      });
      LoggerService().endTrace(logId, { status: Status.Failure });
    }
  });

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch, {
        nextTabId: parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
        isCreating,
        hasError: !!connectionsError,
      }),
    }),
    [intl, dispatch, isCreating, connectionsError, parametersExist]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch, {
        previousTabId: connectionsExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS : undefined,
        isCreating,
        hasError: hasParametersValidationErrors,
      }),
    }),
    [intl, dispatch, isCreating, hasParametersValidationErrors, connectionsExist]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch, {
        previousTabId: parametersExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
          : connectionsExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
            : undefined,
        isCreating,
        hasError: !!workflowError || !!kindError,
      }),
    }),
    [intl, dispatch, isCreating, workflowError, kindError, connectionsExist, parametersExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, createWorkflowFromTemplate, {
        workflowName: existingWorkflowName ?? workflowName ?? '',
        isCreating,
        isCreated,
        errorMessage,
        isPrimaryButtonDisabled: !!workflowError || !kind || !!connectionsError || hasParametersValidationErrors,
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
    ]
  );

  const tabs = useMemo(() => {
    const validTabs = [];
    if (connectionsExist) {
      validTabs.push(connectionsTabItem);
    }
    if (parametersExist) {
      validTabs.push(parametersTabItem);
    }
    validTabs.push(nameStateTabItem);
    validTabs.push(reviewCreateTabItem);
    return validTabs;
  }, [connectionsExist, parametersExist, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
