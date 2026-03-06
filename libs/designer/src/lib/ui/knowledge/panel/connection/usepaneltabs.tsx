import { useMemo, useCallback, useState } from 'react';
import type { AppDispatch } from '../../../../core/state/knowledge/store';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import type { KnowledgeTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { basicsTab } from './tabs/basics';
import { modelTab } from './tabs/model';
import { selectPanelTab } from '../../../../core/state/knowledge/panelSlice';
import { getCosmosDbConnectionParameters } from '../../../../core/knowledge/utils/connection';

export const useCreateConnectionPanelTabs = (): KnowledgeTabProps[] => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const cosmosDbConnectionParameters = getCosmosDbConnectionParameters(intl);
  const [cosmosDbConnectionParametersValues, setCosmosDbConnectionParametersValues] = useState<Record<string, any>>({});
  const [basicsError, setBasicsError] = useState<'error' | undefined>(undefined);
  const handleMoveToModel = useCallback(() => {
    dispatch(selectPanelTab(constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL));
    setBasicsError(
      Object.values(cosmosDbConnectionParametersValues).some((value) => value === undefined || value === '') ? 'error' : undefined
    );
  }, [dispatch, cosmosDbConnectionParametersValues]);

  const handleCreate = useCallback(async () => {
    // Handle create action here, e.g. call an API or update state
  }, []);
  const basicsTabItem = useMemo(
    () =>
      basicsTab(intl, dispatch, cosmosDbConnectionParameters, setCosmosDbConnectionParametersValues, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: handleMoveToModel,
        tabStatusIcon: basicsError,
      }),
    [intl, dispatch, cosmosDbConnectionParameters, handleMoveToModel, basicsError]
  );

  const modelTabItem = useMemo(
    () =>
      modelTab(intl, dispatch, {
        isTabDisabled: false,
        isPrimaryButtonDisabled: false,
        onPrimaryButtonClick: handleCreate,
      }),
    [intl, dispatch, handleCreate]
  );

  return useMemo(() => [basicsTabItem, modelTabItem], [basicsTabItem, modelTabItem]);
};
