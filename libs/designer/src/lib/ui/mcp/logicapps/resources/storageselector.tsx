import { ResourceSelectionWithCreate, type ResourceSelectorProps } from './resourceselector';
import { useStorageAccounts } from '../../../../core/mcp/utils/queries';
import type { RootState } from '../../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useCallback } from 'react';
import { ResourceService } from '@microsoft/logic-apps-shared';

export const StorageAccountSelector = ({
  selectedResource,
  setSelectedResource,
  newResourceName,
  setNewResource,
}: ResourceSelectorProps) => {
  const { subscriptionId, resourceGroup, location } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
  }));
  const { data: storageAccounts, isLoading } = useStorageAccounts(subscriptionId ?? '', location ?? '');
  const intl = useIntl();
  const intlTexts = {
    createPlaceholder: intl.formatMessage({
      defaultMessage: 'Azure Storage Account name',
      id: '79XCgP',
      description: 'Title for the Azure Storage Account name input',
    }),
    createDescription: intl.formatMessage({
      defaultMessage: 'Create a new Azure Storage Account',
      id: 'OeSQhS',
      description: 'Description for the Azure Storage Account create popup',
    }),
  };

  const getResourceId = useCallback(
    (name: string) => {
      return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Storage/storageAccounts/${name}`;
    },
    [subscriptionId, resourceGroup]
  );

  const validateResourceName = useCallback(
    (name: string) => {
      return validateAvailability(name, subscriptionId ?? '', location ?? '');
    },
    [subscriptionId, location]
  );

  return (
    <ResourceSelectionWithCreate
      resourcesList={storageAccounts ?? []}
      isLoading={isLoading}
      selectedResourceId={selectedResource}
      onSelect={setSelectedResource}
      onCreate={setNewResource}
      getResourceId={getResourceId}
      createPlaceholder={intlTexts.createPlaceholder}
      createDescription={intlTexts.createDescription}
      validateResourceName={validateResourceName}
      newResourceName={newResourceName}
    />
  );
};

const validateAvailability = async (name: string, subscriptionId: string, location: string): Promise<string | undefined> => {
  const result = await ResourceService().executeResourceAction(
    `/subscriptions/${subscriptionId}/providers/Microsoft.Storage/locations/${location}/checkNameAvailability`,
    'POST',
    { 'api-version': '2021-01-01' },
    { name, type: 'Microsoft.Storage/storageAccounts' }
  );
  return result.message;
};
