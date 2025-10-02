import { validateNameAvailability } from '../../../../core/mcp/utils/helper';
import { ResourceSelectionWithCreate, type ResourceSelectorProps } from './resourceselector';
import { useAppInsights } from '../../../../core/mcp/utils/queries';
import type { RootState } from '../../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useCallback } from 'react';

export const AppInsightsSelector = ({ selectedResource, setSelectedResource, newResourceName, setNewResource }: ResourceSelectorProps) => {
  const { subscriptionId, resourceGroup } = useSelector((state: RootState) => ({
    subscriptionId: state.mcpOptions.resourceDetails?.subscriptionId,
    resourceGroup: state.mcpOptions.resourceDetails?.resourceGroup,
  }));
  const { data: appInsights, isLoading } = useAppInsights(subscriptionId ?? '');
  const intl = useIntl();
  const intlTexts = {
    createPlaceholder: intl.formatMessage({
      defaultMessage: 'App Insights name',
      id: 'peKfcM',
      description: 'Title for the app insights name input',
    }),
    createDescription: intl.formatMessage({
      defaultMessage: 'Create a new App Insights',
      id: 'ppKDMU',
      description: 'Description for the app insights create popup',
    }),
  };

  const getResourceId = useCallback(
    (name: string) => {
      return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Insights/components/${name}`;
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
      resourcesList={appInsights ?? []}
      required={false}
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
  const resourceIdPrefix = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Insights/components`;
  const apiVersion = '2020-02-02';
  return validateNameAvailability(name, resourceIdPrefix, apiVersion);
};

//TODO: Need to add specific Create new content for this resource to select workspaces and location
