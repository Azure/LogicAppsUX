import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Option, Field, Dropdown, Text } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type LogicAppResource, type Resource, type Template, equals } from '@microsoft/logic-apps-shared';
import { setLogicApp } from '../../../core/state/mcp/resourceSlice';
import { useEmptyLogicApps } from '../../../core/mcp/utils/queries';

export interface LogicAppSelectorProps {
  viewMode?: 'default' | 'alllogicapps';
  onSelectApp?: (value: LogicAppResource) => void;
  lockField?: Template.ResourceFieldId;
}

export const LogicAppSelector = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => state.resource);
  const { data: logicApps, isLoading: isLogicAppsLoading } = useEmptyLogicApps(subscriptionId ?? '');

  const intl = useIntl();
  const intlText = useMemo(
    () => ({
      VALIDATION_ERROR: intl.formatMessage({
        defaultMessage: 'Please select a valid resource',
        id: 'nJfJNU',
        description: 'Validation error message when a resource is not selected',
      }),
      LOGIC_APP: intl.formatMessage({
        defaultMessage: 'Logic app instance',
        id: 'IpD27y',
        description: 'Label field for logic app instance',
      }),
    }),
    [intl]
  );

  const onLogicAppSelect = useCallback(
    (value: string) => {
      const app = logicApps?.find((app) => equals(app.name, value));
      dispatch(
        setLogicApp({
          subscriptionId: subscriptionId ?? '',
          resourceGroup: app?.resourceGroup ?? '',
          location: app?.location ?? '',
          logicAppName: app?.name ?? '',
        })
      );
    },
    [dispatch, subscriptionId, logicApps]
  );

  return (
    <div>
      <Text>resourceGroup: {resourceGroup}</Text>
      <ResourceField
        id="logicapp"
        label={intlText.LOGIC_APP}
        onSelect={onLogicAppSelect}
        defaultKey={logicAppName ?? ''}
        isLoading={isLogicAppsLoading}
        resources={(logicApps ?? []).map((app) => ({
          id: app.id,
          name: app.name,
          displayName: app.name,
        }))}
        errorMessage={logicAppName ? '' : intlText.VALIDATION_ERROR}
      />
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
