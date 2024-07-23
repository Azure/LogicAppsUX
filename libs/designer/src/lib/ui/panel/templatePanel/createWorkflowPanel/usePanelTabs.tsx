import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const { mapping } = useSelector((state: RootState) => state.workflow.connections);
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const connectionsExist = useMemo(() => selectedManifest && Object.keys(selectedManifest?.connections).length > 0, [selectedManifest]);
  const parametersExist = useMemo(() => selectedManifest && selectedManifest.parameters.length > 0, [selectedManifest]);
  const hasParametersValidationErrors = useMemo(() => Object.values(parameterErrors).some((error) => !!error), [parameterErrors]);

  useEffect(() => {
    setIsLoadingCreate(false);
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

  const handleCreateClick = useCallback(async () => {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
    setIsCreated(true);
  }, [onCreateClick]);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch, {
        nextTabId: parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
        hasError: !!connectionsError,
      }),
    }),
    [intl, dispatch, connectionsError, parametersExist]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch, {
        previousTabId: connectionsExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS : undefined,
        hasError: hasParametersValidationErrors,
      }),
    }),
    [intl, dispatch, hasParametersValidationErrors, connectionsExist]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch, {
        previousTabId: parametersExist
          ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS
          : connectionsExist
            ? Constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS
            : undefined,
        hasError: !!workflowError || !!kindError,
      }),
    }),
    [intl, dispatch, workflowError, kindError, connectionsExist, parametersExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, handleCreateClick, {
        workflowName: existingWorkflowName ?? workflowName ?? '',
        isLoadingCreate,
        isPrimaryButtonDisabled: !!workflowError || !kind || !!connectionsError || hasParametersValidationErrors,
        isCreated,
      }),
    }),
    [
      intl,
      dispatch,
      handleCreateClick,
      existingWorkflowName,
      workflowName,
      isLoadingCreate,
      workflowError,
      kind,
      isCreated,
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
