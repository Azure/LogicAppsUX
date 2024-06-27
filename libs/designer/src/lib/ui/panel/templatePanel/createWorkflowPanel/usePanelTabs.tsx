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

export const useCreateWorkflowPanelTabs = ({ onCreateClick }: { onCreateClick: () => Promise<void> }): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { workflowNameValidation, kind, parameters, manifest: selectedManifest } = useSelector((state: RootState) => state.template);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const connectionsExist = useMemo(() => selectedManifest && Object.keys(selectedManifest?.connections).length > 0, [selectedManifest]);
  const parametersExist = useMemo(() => selectedManifest && selectedManifest.parameters.length > 0, [selectedManifest]);
  const hasParametersValidationErrors = useMemo(
    () => Object.values(parameters.validationErrors).some((error) => !!error),
    [parameters.validationErrors]
  );

  useEffect(() => {
    setIsLoadingCreate(false);
    setIsCreated(false);
  }, [selectedManifest]);

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
        hasError: false, //TODO: change when connections validation is implemented
      }),
    }),
    [intl, dispatch, parametersExist]
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
        hasError: !!workflowNameValidation || !kind,
      }),
    }),
    [intl, dispatch, workflowNameValidation, kind, connectionsExist, parametersExist]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, handleCreateClick, {
        isLoadingCreate,
        isPrimaryButtonDisabled: !!workflowNameValidation || !kind || hasParametersValidationErrors, //TODO: add connections validations
        isCreated,
      }),
    }),
    [intl, dispatch, handleCreateClick, isLoadingCreate, workflowNameValidation, kind, isCreated, hasParametersValidationErrors]
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
