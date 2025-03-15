import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Option, Field, Dropdown } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
import { useLocations, useLogicApps, useResourceGroups, useSubscriptions } from '../../../core/templates/utils/queries';
import { setLocation, setResourceGroup, setSubscription, setWorkflowAppName } from '../../../core/state/templates/workflowSlice';
import { type Resource, equals } from '@microsoft/logic-apps-shared';
import { useTemplatesStrings } from '../templatesStrings';

export const ResourcePicker = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, location, workflowAppName, isConsumption } = useSelector((state: RootState) => state.workflow);
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: resourceGroups, isLoading: isResourceGroupLoading } = useResourceGroups(subscriptionId ?? '');
  const { data: locations, isLoading: islocationLoading } = useLocations(subscriptionId ?? '');
  const { data: logicApps, isLoading: isLogicAppsLoading } = useLogicApps(
    subscriptionId ?? '',
    resourceGroup ?? '',
    location ?? '',
    isConsumption
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
    }),
    [intl]
  );

  const { resourceStrings } = useTemplatesStrings();

  return (
    <div>
      <ResourceField
        id="subscriptionId"
        label={resourceStrings.SUBSCRIPTION}
        onSelect={(value) => dispatch(setSubscription(value))}
        defaultKey={subscriptionId}
        isLoading={isLoading}
        resources={subscriptions ?? []}
        errorMessage={subscriptionId ? '' : intlText.VALIDATION_ERROR}
      />
      <ResourceField
        id="resourceGroupName"
        label={resourceStrings.RESOURCE_GROUP}
        onSelect={(value) => dispatch(setResourceGroup(value))}
        defaultKey={resourceGroup}
        isLoading={isResourceGroupLoading}
        resources={resourceGroups ?? []}
        errorMessage={resourceGroup ? '' : intlText.VALIDATION_ERROR}
      />
      <ResourceField
        id="location"
        label={resourceStrings.LOCATION}
        onSelect={(value) => dispatch(setLocation(value))}
        defaultKey={location}
        isLoading={islocationLoading}
        resources={locations ?? []}
        errorMessage={location ? '' : intlText.VALIDATION_ERROR}
      />
      {isConsumption ? null : (
        <ResourceField
          id="logicapp"
          label={resourceStrings.LOGIC_APP}
          onSelect={(value) => dispatch(setWorkflowAppName(value))}
          defaultKey={workflowAppName ?? ''}
          isLoading={isLogicAppsLoading}
          resources={(logicApps ?? []).map((app) => ({
            id: app.id,
            name: app.name,
            displayName: app.name,
          }))}
          errorMessage={workflowAppName ? '' : intlText.VALIDATION_ERROR}
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
  onSelect,
}: {
  id: string;
  label: string;
  defaultKey: string;
  resources: Resource[];
  onSelect: (value: any) => void;
  isLoading?: boolean;
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
          disabled={isLoading}
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
