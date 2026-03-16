import { useMemo, useCallback, useState } from 'react';
import type { AppDispatch } from '../../../../core/state/knowledge/store';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import type { KnowledgeTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { basicsTab } from './tabs/basics';
import { modelTab } from './tabs/model';
import { closePanel, selectPanelTab } from '../../../../core/state/knowledge/panelSlice';
import {
  createOrUpdateConnection,
  getCosmosDbConnectionParameters,
  getOpenAIConnectionParameters,
} from '../../../../core/knowledge/utils/connection';

export const useCreateConnectionPanelTabs = (): KnowledgeTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const cosmosDbConnectionParameters = getCosmosDbConnectionParameters(intl);
  const [cosmosDbConnectionParametersValues, setCosmosDbConnectionParametersValues] = useState<Record<string, any>>({});
  const [basicsError, setBasicsError] = useState<'error' | undefined>(undefined);

  const openAIConnectionParameters = getOpenAIConnectionParameters(intl);
  const [openAIConnectionParametersValues, setOpenAIConnectionParametersValues] = useState<Record<string, any>>({});

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleMoveToModel = useCallback(() => {
    dispatch(selectPanelTab(constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL));
    setBasicsError(
      Object.values(cosmosDbConnectionParametersValues).some((value) => value === undefined || value === '') ? 'error' : undefined
    );
  }, [dispatch, cosmosDbConnectionParametersValues]);

  const handleCreate = useCallback(async () => {
    try {
      setIsCreating(true);
      await createOrUpdateConnection({ ...cosmosDbConnectionParametersValues, ...openAIConnectionParametersValues });
      // TODO: Setup toast notification for success and failure cases
      dispatch(closePanel());
    } catch (error) {
      console.error('Error creating connection:', error);
    } finally {
      setIsCreating(false);
    }
  }, [cosmosDbConnectionParametersValues, dispatch, openAIConnectionParametersValues]);
  const basicsTabItem = useMemo(
    () =>
      basicsTab(
        intl,
        dispatch,
        cosmosDbConnectionParameters,
        cosmosDbConnectionParametersValues,
        setCosmosDbConnectionParametersValues,
        isCreating,
        {
          isTabDisabled: isCreating,
          isPrimaryButtonDisabled: isCreating,
          onPrimaryButtonClick: handleMoveToModel,
          tabStatusIcon: basicsError,
        }
      ),
    [intl, dispatch, cosmosDbConnectionParameters, cosmosDbConnectionParametersValues, isCreating, handleMoveToModel, basicsError]
  );

  const modelTabItem = useMemo(
    () =>
      modelTab(
        intl,
        dispatch,
        openAIConnectionParameters,
        openAIConnectionParametersValues,
        setOpenAIConnectionParametersValues,
        isCreating,
        {
          isTabDisabled: isCreating,
          isPrimaryButtonDisabled: isCreating,
          onPrimaryButtonClick: handleCreate,
        }
      ),
    [intl, dispatch, openAIConnectionParameters, openAIConnectionParametersValues, isCreating, handleCreate]
  );

  return useMemo(() => [basicsTabItem, modelTabItem], [basicsTabItem, modelTabItem]);
};
