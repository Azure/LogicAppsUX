import { useMemo, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import type { KnowledgeTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { basicsTab } from './tabs/basics';
import { modelTab } from './tabs/model';
import {
  createOrUpdateConnection,
  getCosmosDbConnectionParameters,
  getOpenAIConnectionParameters,
} from '../../../../core/knowledge/utils/connection';

export const useCreateConnectionPanelTabs = ({
  selectTab,
  close,
}: {
  selectTab: (tabId: string) => void;
  close: () => void;
}): KnowledgeTabProps[] => {
  const intl = useIntl();
  const cosmosDbConnectionParameters = getCosmosDbConnectionParameters(intl);
  const [cosmosDbConnectionParametersValues, setCosmosDbConnectionParametersValues] = useState<Record<string, any>>({});
  const [basicsError, setBasicsError] = useState<'error' | undefined>(undefined);

  const openAIConnectionParameters = getOpenAIConnectionParameters(intl);
  const [openAIConnectionParametersValues, setOpenAIConnectionParametersValues] = useState<Record<string, any>>({});

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleMoveToModel = useCallback(() => {
    selectTab(constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL);
    setBasicsError(
      Object.values(cosmosDbConnectionParametersValues).some((value) => value === undefined || value === '') ? 'error' : undefined
    );
  }, [cosmosDbConnectionParametersValues, selectTab]);

  const handleCreate = useCallback(async () => {
    try {
      setIsCreating(true);
      await createOrUpdateConnection({ ...cosmosDbConnectionParametersValues, ...openAIConnectionParametersValues });
      // TODO: Setup toast notification for success and failure cases
      close();
    } catch (error) {
      console.error('Error creating connection:', error);
    } finally {
      setIsCreating(false);
    }
  }, [cosmosDbConnectionParametersValues, openAIConnectionParametersValues, close]);
  const basicsTabItem = useMemo(
    () =>
      basicsTab(
        intl,
        close,
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
    [intl, close, cosmosDbConnectionParameters, cosmosDbConnectionParametersValues, isCreating, handleMoveToModel, basicsError]
  );

  const modelTabItem = useMemo(
    () =>
      modelTab(
        intl,
        selectTab,
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
    [intl, selectTab, openAIConnectionParameters, openAIConnectionParametersValues, isCreating, handleCreate]
  );

  return useMemo(() => [basicsTabItem, modelTabItem], [basicsTabItem, modelTabItem]);
};
