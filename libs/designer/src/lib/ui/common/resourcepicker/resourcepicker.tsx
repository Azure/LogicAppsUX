import { useIntl } from 'react-intl';
import { useCallback, useMemo } from 'react';
import { useLocations, useLogicApps, useResourceGroups, useSubscriptions } from '../../../core/queries/resource';
import { type LogicAppResource, type Template, equals } from '@microsoft/logic-apps-shared';
import { useAllLogicApps } from '../../../core/configuretemplate/utils/queries';
import { ResourceField, type ResourceFieldRenderType } from './resourcefield';
import { useResourceStrings } from './resourcestrings';

export interface BaseResourcePickerProps {
  viewMode?: 'default' | 'alllogicapps';
  onSelectApp?: (value: LogicAppResource) => void;
  lockField?: Template.ResourceFieldId;
}

export const ResourceKind = {
  SubscriptionId: 'subscriptionId',
  ResourceGroupName: 'resourceGroupName',
  Location: 'location',
  LogicApp: 'logicapp',
  AllLogicApp: 'alllogicapp',
} as const;
export type ResourceKind = (typeof ResourceKind)[keyof typeof ResourceKind];

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
  renderType?: ResourceFieldRenderType;
  showErrorMessage?: boolean;
  hintTooltips?: Partial<Record<ResourceKind, string>>;
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
  renderType,
  showErrorMessage = true,
  hintTooltips,
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

  const resourceStrings = useResourceStrings();
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
        id={ResourceKind.SubscriptionId}
        label={resourceStrings.SUBSCRIPTION}
        onSelect={onSubscriptionSelect}
        defaultKey={subscriptionId}
        isLoading={isLoading}
        resources={subscriptions ?? []}
        errorMessage={!showErrorMessage || subscriptionId ? '' : intlText.VALIDATION_ERROR}
        lockField={lockField === 'subscription' || lockField === 'resourcegroup' || lockField === 'resource'}
        renderType={renderType}
        hintTooltip={hintTooltips?.subscriptionId}
      />
      <ResourceField
        id={ResourceKind.ResourceGroupName}
        label={resourceStrings.RESOURCE_GROUP}
        onSelect={onResourceGroupSelect}
        defaultKey={resourceGroup}
        isLoading={isResourceGroupLoading}
        resources={resourceGroups ?? []}
        errorMessage={!showErrorMessage || resourceGroup ? '' : intlText.VALIDATION_ERROR}
        lockField={lockField === 'resourcegroup' || lockField === 'resource'}
        renderType={renderType}
        hintTooltip={hintTooltips?.resourceGroupName}
      />
      {isDefaultMode && isConsumption ? (
        <ResourceField
          id={ResourceKind.Location}
          label={resourceStrings.LOCATION}
          onSelect={onLocationSelect}
          defaultKey={location}
          isLoading={islocationLoading}
          resources={locations ?? []}
          errorMessage={!showErrorMessage || location ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'location' || lockField === 'resource'}
          renderType={renderType}
          hintTooltip={hintTooltips?.location}
        />
      ) : null}
      {isDefaultMode && !isConsumption ? (
        <ResourceField
          id={ResourceKind.LogicApp}
          label={resourceStrings.LOGIC_APP}
          onSelect={handleLogicAppSelect}
          defaultKey={workflowAppName ?? ''}
          isLoading={isLogicAppsLoading}
          resources={(logicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: app.name,
          }))}
          errorMessage={!showErrorMessage || workflowAppName ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'resource'}
          renderType={renderType}
          hintTooltip={hintTooltips?.logicapp}
        />
      ) : null}
      {isDefaultMode ? null : (
        <ResourceField
          id={ResourceKind.AllLogicApp}
          label={intlText.ALL_LOGIC_APPS}
          onSelect={handleLogicAppInstanceSelect}
          defaultKey={logicAppName ?? ''}
          isLoading={isAllLogicAppsLoading}
          resources={(allLogicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: equals(app.plan, 'consumption') ? `${app.name} (Consumption)` : `${app.name} (Standard)`,
          }))}
          errorMessage={!showErrorMessage || logicAppName ? '' : intlText.VALIDATION_ERROR}
          lockField={lockField === 'resource'}
          renderType={renderType}
          hintTooltip={hintTooltips?.alllogicapp}
        />
      )}
    </div>
  );
};
