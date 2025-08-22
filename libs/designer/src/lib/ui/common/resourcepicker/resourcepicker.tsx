import { useIntl } from 'react-intl';
import { useCallback, useMemo } from 'react';
import { useLocations, useLogicApps, useResourceGroups, useSubscriptions } from '../../../core/queries/resource';
import { type LogicAppResource, type Template, equals } from '@microsoft/logic-apps-shared';
import { useAllLogicApps } from '../../../core/configuretemplate/utils/queries';
import { useTemplatesStrings } from './../../templates/templatesStrings';
import { ResourceField } from './resourcefield';

export interface BaseResourcePickerProps {
  viewMode?: 'default' | 'alllogicapps';
  onSelectApp?: (value: LogicAppResource) => void;
  lockField?: Template.ResourceFieldId;
}

export interface ResourcePickerProps extends BaseResourcePickerProps {
  resourceState: {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
    workflowAppName: string | undefined;
    logicAppName: string | undefined;
    isConsumption: boolean | undefined;
  };
  onSubscriptionSelect: (value: string) => void;
  onResourceGroupSelect: (value: string) => void;
  onLocationSelect: (value: string) => void;
  onLogicAppSelect: (value: { name: string; location: string }) => void;
  onLogicAppInstanceSelect: (value: { name: string; location: string; plan: string }) => void;
}

export const ResourcePicker = ({
  viewMode = 'default',
  onSelectApp,
  lockField,
  resourceState,
  onSubscriptionSelect,
  onResourceGroupSelect,
  onLocationSelect,
  onLogicAppSelect,
  onLogicAppInstanceSelect,
}: ResourcePickerProps) => {
  const isDefaultMode = viewMode === 'default';
  const { subscriptionId, resourceGroup, location, workflowAppName, logicAppName, isConsumption } = resourceState;
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: resourceGroups, isLoading: isResourceGroupLoading } = useResourceGroups(subscriptionId ?? '');
  const { data: locations, isLoading: islocationLoading } = useLocations(subscriptionId ?? '');
  const { data: logicApps, isLoading: isLogicAppsLoading } = useLogicApps(
    subscriptionId ?? '',
    resourceGroup ?? '',
    isDefaultMode && !isConsumption
  );
  const { data: allLogicApps, isLoading: isAllLogicAppsLoading } = useAllLogicApps(
    subscriptionId ?? '',
    resourceGroup ?? '',
    !isDefaultMode
  );

  const intl = useIntl();
  const intlText = useMemo(
    () => ({
      SECTION_DESCRIPTION: intl.formatMessage({
        defaultMessage: 'Select the resource location for your workflow',
        id: 'e1+Gqi',
        description: 'Description for resource location section.',
      }),
      VALIDATION_ERROR: intl.formatMessage({
        defaultMessage: 'Please select a valid resource',
        id: 'nJfJNU',
        description: 'Validation error message when a resource is not selected',
      }),
      ALL_LOGIC_APPS: intl.formatMessage({
        defaultMessage: 'Logic app instance',
        id: 'IpD27y',
        description: 'Label field for logic app instance',
      }),
    }),
    [intl]
  );

  const { resourceStrings } = useTemplatesStrings();
  const handleLogicAppSelect = useCallback(
    (value: string) => {
      const app = logicApps?.find((app) => equals(app.name, value));
      onLogicAppSelect({ name: value, location: app?.location ?? '' });
    },
    [onLogicAppSelect, logicApps]
  );

  const handleLogicAppInstanceSelect = useCallback(
    (value: string) => {
      const app = allLogicApps?.find((app) => equals(app.name, value));
      onLogicAppInstanceSelect({ name: value, location: app?.location ?? '', plan: app?.plan ?? '' });

      if (app) {
        onSelectApp?.(app);
      }
    },
    [onLogicAppInstanceSelect, allLogicApps, onSelectApp]
  );

  return (
    <div>
      <ResourceField
        id="subscriptionId"
        label={resourceStrings.SUBSCRIPTION}
        onSelect={onSubscriptionSelect}
        defaultKey={subscriptionId}
        isLoading={isLoading}
        resources={subscriptions ?? []}
        errorMessage={subscriptionId ? '' : intlText.VALIDATION_ERROR}
        lockField={lockField === 'subscription' || lockField === 'resourcegroup' || lockField === 'resource'}
      />
      <ResourceField
        id="resourceGroupName"
        label={resourceStrings.RESOURCE_GROUP}
        onSelect={onResourceGroupSelect}
        defaultKey={resourceGroup}
        isLoading={isResourceGroupLoading}
        resources={resourceGroups ?? []}
        errorMessage={resourceGroup ? '' : intlText.VALIDATION_ERROR}
        lockField={lockField === 'resourcegroup' || lockField === 'resource'}
      />
      {isDefaultMode && isConsumption ? (
        <ResourceField
          id="location"
          label={resourceStrings.LOCATION}
          onSelect={onLocationSelect}
          defaultKey={location}
          isLoading={islocationLoading}
          resources={locations ?? []}
          errorMessage={location ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'location' || lockField === 'resource'}
        />
      ) : null}
      {isDefaultMode && !isConsumption ? (
        <ResourceField
          id="logicapp"
          label={resourceStrings.LOGIC_APP}
          onSelect={handleLogicAppSelect}
          defaultKey={workflowAppName ?? ''}
          isLoading={isLogicAppsLoading}
          resources={(logicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: app.name,
          }))}
          errorMessage={workflowAppName ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'resource'}
        />
      ) : null}
      {isDefaultMode ? null : (
        <ResourceField
          id="alllogicapp"
          label={intlText.ALL_LOGIC_APPS}
          onSelect={handleLogicAppInstanceSelect}
          defaultKey={logicAppName ?? ''}
          isLoading={isAllLogicAppsLoading}
          resources={(allLogicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: equals(app.plan, 'consumption') ? `${app.name} (Consumption)` : `${app.name} (Standard)`,
          }))}
          errorMessage={logicAppName ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'resource'}
        />
      )}
    </div>
  );
};
