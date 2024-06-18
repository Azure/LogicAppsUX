import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { connectionsTab } from './tabs/connectionsTab';
import { parametersTab } from './tabs/parametersTab';
import { nameStateTab } from './tabs/nameStateTab';
import { reviewCreateTab } from './tabs/reviewCreateTab';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import type { TemplatePanelTab } from '@microsoft/designer-ui';

export const useCreateWorkflowPanelTabs = (onCreateClick: () => Promise<void>): TemplatePanelTab[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { parameters } = useSelector((state: RootState) => state.template);
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);

  const handleCreateClick = useCallback(async () => {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
  }, [onCreateClick]);

  const connectionsTabItem = useMemo(
    () => ({
      ...connectionsTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const parametersTabItem = useMemo(
    () => ({
      ...parametersTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const nameStateTabItem = useMemo(
    () => ({
      ...nameStateTab(intl, dispatch),
    }),
    [intl, dispatch]
  );

  const reviewCreateTabItem = useMemo(
    () => ({
      ...reviewCreateTab(intl, dispatch, handleCreateClick, {
        isLoading: isLoadingCreate,
        isButtonDisabled: !(existingWorkflowName ?? workflowName) || !kind,
      }),
    }),
    [intl, dispatch, handleCreateClick, isLoadingCreate, existingWorkflowName, workflowName, kind]
  );

  const tabs = useMemo(() => {
    if (!parameters) {
      return [connectionsTabItem, nameStateTabItem, reviewCreateTabItem];
    }
    return [connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem];
  }, [parameters, connectionsTabItem, parametersTabItem, nameStateTabItem, reviewCreateTabItem]);

  return tabs;
};
