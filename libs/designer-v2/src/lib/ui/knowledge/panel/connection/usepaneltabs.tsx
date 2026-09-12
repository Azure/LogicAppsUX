import { useMemo, useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import type { KnowledgeTabProps } from '@microsoft/designer-ui';
import constants from '../../../../common/constants';
import { basicsTab, getSelectedAuthIndex } from './tabs/basics';
import { modelTab } from './tabs/model';
import {
  createOrUpdateConnection,
  getCosmosDbConnectionParameters,
  getOpenAIConnectionParameters,
} from '../../../../core/knowledge/utils/connection';
import type { ServerNotificationData } from '../../../../core/state/knowledge/optionsSlice';

export const useCreateConnectionPanelTabs = ({
  selectTab,
  close,
  onCreate,
  onError,
}: {
  selectTab: (tabId: string) => void;
  close: () => void;
  onCreate?: () => void;
  onError: (data: ServerNotificationData | null) => void;
}): KnowledgeTabProps[] => {
  const intl = useIntl();
  const cosmosDbConnectionParameters = getCosmosDbConnectionParameters(intl);
  const [cosmosDbConnectionParametersValues, setCosmosDbConnectionParametersValues] = useState<Record<string, any>>({});
  const [selectedCosmosDbSubscriptionId, setSelectedCosmosDbSubscriptionId] = useState('');
  const [basicsError, setBasicsError] = useState<'error' | undefined>(undefined);

  const openAIConnectionParameters = getOpenAIConnectionParameters(intl);
  const [openAIConnectionParametersValues, setOpenAIConnectionParametersValues] = useState<Record<string, any>>({});

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const isBasicsValid = useMemo(() => {
    const displayName = cosmosDbConnectionParametersValues.displayName;
    if (typeof displayName !== 'string' || displayName.trim() === '') {
      return false;
    }

    const selectedParameterSetIndex = getSelectedAuthIndex(
      cosmosDbConnectionParameters,
      cosmosDbConnectionParametersValues.cosmosDBAuthenticationType
    );
    const selectedParameters = cosmosDbConnectionParameters.values[selectedParameterSetIndex]?.parameters ?? {};

    return Object.entries(selectedParameters).every(
      ([key, parameter]) =>
        parameter.uiDefinition?.constraints?.required !== 'true' ||
        (cosmosDbConnectionParametersValues[key] !== undefined && cosmosDbConnectionParametersValues[key] !== '')
    );
  }, [cosmosDbConnectionParameters, cosmosDbConnectionParametersValues]);

  const handleMoveToModel = useCallback(() => {
    if (!isBasicsValid) {
      setBasicsError('error');
      return;
    }

    setBasicsError(undefined);
    selectTab(constants.KNOWLEDGE_PANEL_TAB_NAMES.MODEL);
  }, [isBasicsValid, selectTab]);

  const handleCreate = useCallback(async () => {
    try {
      setIsCreating(true);
      onError(null);
      await createOrUpdateConnection({ ...cosmosDbConnectionParametersValues, ...openAIConnectionParametersValues });
      onCreate?.();
      close();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError({
        title: intl.formatMessage({
          defaultMessage: 'Failed to create connection',
          id: 'k47GxU',
          description: 'Error title when connection creation fails',
        }),
        content: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  }, [cosmosDbConnectionParametersValues, openAIConnectionParametersValues, onCreate, close, onError, intl]);
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
          isPrimaryButtonDisabled: isCreating || !isBasicsValid,
          onPrimaryButtonClick: handleMoveToModel,
          tabStatusIcon: basicsError,
          selectedSubscriptionId: selectedCosmosDbSubscriptionId,
          selectSubscriptionCallback: setSelectedCosmosDbSubscriptionId,
        }
      ),
    [
      intl,
      close,
      cosmosDbConnectionParameters,
      cosmosDbConnectionParametersValues,
      isCreating,
      isBasicsValid,
      handleMoveToModel,
      basicsError,
      selectedCosmosDbSubscriptionId,
    ]
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
