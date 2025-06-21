import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Option, Field, Dropdown } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocations, useLogicApps, useResourceGroups, useSubscriptions } from '../../../core/templates/utils/queries';
import {
  setLocation,
  setLogicAppDetails,
  setResourceGroup,
  setSubscription,
  setWorkflowAppDetails,
} from '../../../core/state/templates/workflowSlice';
import { type LogicAppResource, type Resource, equals } from '@microsoft/logic-apps-shared';
import { useTemplatesStrings } from '../templatesStrings';
import { useAllLogicApps } from '../../../core/configuretemplate/utils/queries';

export interface ResourcePickerProps {
  viewMode?: 'default' | 'alllogicapps';
  onSelectApp?: (value: LogicAppResource) => void;
  disableOnValue?: boolean;
}

export const ResourcePicker = ({ viewMode = 'default', onSelectApp, disableOnValue = false }: ResourcePickerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const isDefaultMode = viewMode === 'default';
  const { subscriptionId, resourceGroup, location, workflowAppName, logicAppName, isConsumption } = useSelector(
    (state: RootState) => state.workflow
  );
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
  const onLogicAppSelect = useCallback(
    (value: string) => {
      const app = logicApps?.find((app) => equals(app.name, value));
      dispatch(setWorkflowAppDetails({ name: value, location: app?.location ?? '' }));
    },
    [dispatch, logicApps]
  );

  const onLogicAppInstanceSelect = useCallback(
    (value: string) => {
      const app = allLogicApps?.find((app) => equals(app.name, value));
      dispatch(setLogicAppDetails({ name: value, location: app?.location ?? '', plan: app?.plan ?? '' }));

      if (app) {
        onSelectApp?.(app);
      }
    },
    [dispatch, allLogicApps, onSelectApp]
  );

  return (
    <div>
      <ResourceField
        id="subscriptionId"
        label={resourceStrings.SUBSCRIPTION}
        onSelect={(value) => dispatch(setSubscription(value))}
        defaultKey={subscriptionId}
        isLoading={isLoading}
        disableOnValue={disableOnValue}
        resources={subscriptions ?? []}
        errorMessage={subscriptionId ? '' : intlText.VALIDATION_ERROR}
      />
      <ResourceField
        id="resourceGroupName"
        label={resourceStrings.RESOURCE_GROUP}
        onSelect={(value) => dispatch(setResourceGroup(value))}
        defaultKey={resourceGroup}
        isLoading={isResourceGroupLoading}
        disableOnValue={disableOnValue}
        resources={resourceGroups ?? []}
        errorMessage={resourceGroup ? '' : intlText.VALIDATION_ERROR}
      />
      {isDefaultMode && isConsumption ? (
        <ResourceField
          id="location"
          label={resourceStrings.LOCATION}
          onSelect={(value) => dispatch(setLocation(value))}
          defaultKey={location}
          isLoading={islocationLoading}
          disableOnValue={disableOnValue}
          resources={locations ?? []}
          errorMessage={location ? '' : intlText.VALIDATION_ERROR}
        />
      ) : null}
      {isDefaultMode && !isConsumption ? (
        <ResourceField
          id="logicapp"
          label={resourceStrings.LOGIC_APP}
          onSelect={onLogicAppSelect}
          defaultKey={workflowAppName ?? ''}
          isLoading={isLogicAppsLoading}
          disableOnValue={disableOnValue}
          resources={(logicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: app.name,
          }))}
          errorMessage={workflowAppName ? '' : intlText.VALIDATION_ERROR}
        />
      ) : null}
      {isDefaultMode ? null : (
        <ResourceField
          id="alllogicapp"
          label={intlText.ALL_LOGIC_APPS}
          onSelect={onLogicAppInstanceSelect}
          defaultKey={logicAppName ?? ''}
          isLoading={isAllLogicAppsLoading}
          disableOnValue={disableOnValue}
          resources={(allLogicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: equals(app.plan, 'consumption') ? `${app.name} (Consumption)` : `${app.name} (Standard)`,
          }))}
          errorMessage={logicAppName ? '' : intlText.VALIDATION_ERROR}
        />
      )}
    </div>
  );
};

const ResourceField = ({
  id,
  label,
  resources,
  defaultKey,
  errorMessage,
  isLoading,
  disableOnValue,
  onSelect,
}: {
  id: string;
  label: string;
  defaultKey: string;
  resources: Resource[];
  onSelect: (value: any) => void;
  isLoading?: boolean;
  disableOnValue?: boolean;
  errorMessage?: string;
}) => {
  const intl = useIntl();
  const texts = {
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading resources ...',
      id: 'IMWSjN',
      description: 'Loading text',
    }),
    NO_ITEMS: intl.formatMessage({
      defaultMessage: 'No resources found',
      id: 'yytPY3',
      description: 'No items to select text',
    }),
  };

  const sortedResources = useMemo(() => resources.sort((a, b) => a.displayName.localeCompare(b.displayName)), [resources]);

  const [selectedResource, setSelectedResource] = useState<string | undefined>('');
  useEffect(() => {
    if (!isLoading) {
      const resource = resources.find((resource) => equals(resource.name, defaultKey))?.displayName;
      if (!resource && !!defaultKey) {
        onSelect('');
      }

      if (resource !== selectedResource) {
        setSelectedResource(resource);
      }
    }
  }, [resources, defaultKey, onSelect, isLoading, selectedResource]);

  return (
    <div style={{ marginBottom: '12px' }}>
      <Field
        className="msla-templates-tab-label"
        label={label}
        required={true}
        validationMessage={errorMessage}
        validationState={errorMessage ? 'error' : 'none'}
      >
        <Dropdown
          style={{ width: '100%' }}
          id={id}
          onOptionSelect={(e, option) => onSelect(option?.optionValue)}
          disabled={isLoading || (disableOnValue && !!selectedResource)}
          value={selectedResource}
          selectedOptions={[defaultKey]}
          size="small"
          placeholder={isLoading ? texts.LOADING : ''}
        >
          {!isLoading && !sortedResources.length ? (
            <Option key={'no-items'} value={'#noitem#'} disabled>
              {texts.NO_ITEMS}
            </Option>
          ) : (
            sortedResources.map((resource) => (
              <Option key={resource.id} value={resource.name}>
                {resource.displayName}
              </Option>
            ))
          )}
        </Dropdown>
      </Field>
    </div>
  );
};
