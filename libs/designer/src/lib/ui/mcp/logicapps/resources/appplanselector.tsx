import { validateNameAvailability } from '../../../../core/mcp/utils/helper';
import { ResourceSelectionWithCreate, type ResourceSelectorProps } from './resourceselector';
import { useAppServicePlans } from '../../../../core/mcp/utils/queries';
import type { RootState } from '../../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useCallback } from 'react';

export const AppPlanSelector = ({ selectedResource, setSelectedResource, newResourceName, setNewResource }: ResourceSelectorProps) => {
  const { subscriptionId, resourceGroup, location } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
    location: state.mcpOptions.resourceDetails?.location,
  }));
  const { data: appServicePlans, isLoading } = useAppServicePlans(subscriptionId ?? '', location ?? '');
  const intl = useIntl();
  const intlTexts = {
    createPlaceholder: intl.formatMessage({
      defaultMessage: 'App Service plan name',
      id: 'JYpccF',
      description: 'Title for the app service plan name input',
    }),
    createDescription: intl.formatMessage({
      defaultMessage: 'Create a new App Service plan',
      id: 'Wad3U/',
      description: 'Description for the app service plan create popup',
    }),
  };

  const getResourceId = useCallback(
    (name: string) => {
      return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/serverfarms/${name}`;
    },
    [subscriptionId, resourceGroup]
  );

  const validateResourceName = useCallback(
    (name: string) => {
      return validateAvailability(name, subscriptionId ?? '', resourceGroup ?? '');
    },
    [subscriptionId, resourceGroup]
  );

  return (
    <ResourceSelectionWithCreate
      resourcesList={appServicePlans ?? []}
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

const validateAvailability = async (name: string, subscriptionId: string, resourceGroup: string): Promise<string | undefined> => {
  const resourceIdPrefix = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/serverfarms`;
  const apiVersion = '2018-11-01';
  return validateNameAvailability(name, resourceIdPrefix, apiVersion);
};
