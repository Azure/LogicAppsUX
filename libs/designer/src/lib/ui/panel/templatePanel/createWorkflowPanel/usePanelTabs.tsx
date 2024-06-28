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
import { TemplateService } from '@microsoft/logic-apps-shared';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import { validateKind, validateParameters, validateWorkflowName } from '../../../../core/state/templates/templateSlice';

export const useCreateWorkflowPanelTabs = ({ onCreateClick }: { onCreateClick: () => Promise<void> }): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const {
    workflowNameValidationError,
    kind,
    kindError,
    parameters,
    manifest: selectedManifest,
  } = useSelector((state: RootState) => state.template);
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const connectionsExist = useMemo(() => selectedManifest && Object.keys(selectedManifest?.connections).length > 0, [selectedManifest]);
  const parametersExist = useMemo(() => selectedManifest && selectedManifest.parameters.length > 0, [selectedManifest]);
  const hasConnectionsValidationErrors = false; //TODO: change when connections validation is implemented
  const hasParametersValidationErrors = useMemo(
    () => Object.values(parameters.validationErrors).some((error) => !!error),
    [parameters.validationErrors]
  );

  useEffect(() => {
    setIsLoadingCreate(false);
    setIsCreated(false);
  }, [selectedManifest]);

  useEffect(() => {
    if (
      selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE ||
      selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE
    ) {
      dispatch(validateParameters());
      if (selectedTabId === Constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE) {
        dispatch(validateWorkflowName(existingWorkflowNames ?? []));
        dispatch(validateKind());
      }
    }
  }, [dispatch, existingWorkflowNames, selectedTabId, kind]);

  const handleCreateClick = useCallback(async () => {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
    setIsCreated(true);
    TemplateService()?.openBladeAfterCreate();
  }, [onCreateClick]);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch, {
        nextTabId: parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
        hasError: hasConnectionsValidationErrors,
      }),
    }),
    [intl, dispatch, hasConnectionsValidationErrors, parametersExist]
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
        hasError: !!workflowNameValidationError || !!kindError,
      }),
    }),
    [intl, dispatch, workflowNameValidationError, kindError, connectionsExist, parametersExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, handleCreateClick, {
        isLoadingCreate,
        isPrimaryButtonDisabled: !!workflowNameValidationError || !kind || hasConnectionsValidationErrors || hasParametersValidationErrors,
        isCreated,
      }),
    }),
    [
      intl,
      dispatch,
      handleCreateClick,
      isLoadingCreate,
      workflowNameValidationError,
      kind,
      isCreated,
      hasConnectionsValidationErrors,
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
