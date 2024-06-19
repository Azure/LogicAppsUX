import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import Constants from '../../../../common/constants';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';

export const useCreateWorkflowPanelTabs = (onCreateClick: () => Promise<void>): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const selectedManifest = useSelector((state: RootState) => state.template.manifest);
  const { workflowName, kind, parameters } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);

  const connectionsExist = useMemo(() => selectedManifest && Object.keys(selectedManifest?.connections).length > 0, [selectedManifest]);
  const parametersExist = useMemo(() => selectedManifest && selectedManifest.parameters.length > 0, [selectedManifest]);
  const hasParametersValidationErrors = useMemo(
    () => Object.values(parameters.validationErrors).some((error) => !!error),
    [parameters.validationErrors]
  );
  const missingRequiredParameters = useMemo(
    () => Object.values(parameters.definitions).some((param) => param.required && !param.value),
    [parameters.definitions]
  );
  const missingWorkflowName = isUndefinedOrEmptyString(existingWorkflowName ?? workflowName);

  const handleCreateClick = useCallback(async () => {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
  }, [onCreateClick]);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(
        intl,
        dispatch,
        parametersExist ? Constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS : Constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE
      ),
    }),
    [intl, dispatch, parametersExist]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch, hasParametersValidationErrors, missingRequiredParameters),
    }),
    [intl, dispatch, hasParametersValidationErrors, missingRequiredParameters]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch, missingWorkflowName || !kind),
    }),
    [intl, dispatch, missingWorkflowName, kind]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, handleCreateClick, {
        isLoading: isLoadingCreate,
        isButtonDisabled: missingWorkflowName || !kind,
      }),
    }),
    [intl, dispatch, handleCreateClick, isLoadingCreate, missingWorkflowName, kind]
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
