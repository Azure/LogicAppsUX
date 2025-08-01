import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Field, Text, Combobox, Option } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { equals } from '@microsoft/logic-apps-shared';
import { setLogicApp } from '../../../core/state/mcp/resourceSlice';
import { useEmptyLogicApps } from '../../../core/mcp/utils/queries';
import { useMcpDetailsStyles } from './styles';

const NO_ITEM_VALUE = 'noitem';

export const LogicAppSelector = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { subscriptionId, logicAppName } = useSelector((state: RootState) => state.resource);
  const { data: logicApps, isLoading: isLogicAppsLoading } = useEmptyLogicApps(subscriptionId ?? '');

  const intl = useIntl();
  const styles = useMcpDetailsStyles();

  const intlText = useMemo(
    () => ({
      LOGIC_APP: intl.formatMessage({
        defaultMessage: 'Logic app instance',
        id: 'IpD27y',
        description: 'Label field for logic app instance',
      }),
      LOADING: intl.formatMessage({
        defaultMessage: 'Loading logic apps ...',
        id: 'BwxTBw',
        description: 'Loading logic apps',
      }),
      NO_ITEMS: intl.formatMessage({
        defaultMessage: 'No logic apps found',
        id: '/boIFK',
        description: 'No logic apps items to select text',
      }),
      SEARCH_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Search logic apps...',
        id: '/4vNBB',
        description: 'Placeholder text for logic app search',
      }),
      SELECT_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Select a logic app',
        id: 'TxdbTq',
        description: 'Placeholder text for logic app selection',
      }),
      NO_RESULTS: intl.formatMessage({
        defaultMessage: 'No results for',
        id: 'W83QYZ',
        description: 'Text displayed when no results match the search term',
      }),
    }),
    [intl]
  );

  const [selectedResource, setSelectedResource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const resources = useMemo(() => {
    if (!logicApps?.length) {
      return [];
    }

    return logicApps
      .map((app) => ({
        id: app.id,
        name: app.name,
        displayName: app.name,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [logicApps]);

  const filteredResources = useMemo(() => {
    if (!searchTerm.trim()) {
      return resources;
    }

    return resources.filter((resource) => resource.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [resources, searchTerm]);

  const onLogicAppSelect = useCallback(
    (value: string) => {
      const app = logicApps?.find((app) => equals(app.name, value));
      if (app) {
        dispatch(
          setLogicApp({
            resourceGroup: app.resourceGroup,
            location: app.location,
            logicAppName: app.name,
          })
        );
        setSelectedResource(app.name);
      }
    },
    [dispatch, logicApps]
  );

  useEffect(() => {
    if (!isLogicAppsLoading) {
      const resource = resources.find((resource) => equals(resource.name, logicAppName ?? ''))?.displayName;
      if (!resource && !!logicAppName) {
        setSelectedResource('');
      }

      if (resource !== selectedResource) {
        setSelectedResource(resource ?? '');
      }
    }
  }, [resources, logicAppName, isLogicAppsLoading, selectedResource]);

  return (
    <div className={styles.container}>
      <div className={styles.labelSection}>
        <Text>{intlText.LOGIC_APP}</Text>
      </div>
      <div className={styles.fieldSection}>
        <Field required={true}>
          <Combobox
            style={{ width: '100%' }}
            disabled={isLogicAppsLoading}
            value={searchTerm || selectedResource}
            placeholder={isLogicAppsLoading ? intlText.LOADING : intlText.SEARCH_PLACEHOLDER}
            onOpenChange={(_, data) => {
              if (!data.open) {
                setSearchTerm('');
              }
            }}
            onOptionSelect={(_, data) => {
              if (data.optionValue && data.optionValue !== NO_ITEM_VALUE) {
                onLogicAppSelect(data.optionValue);
                setSearchTerm('');
              }
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
          >
            {!isLogicAppsLoading && !filteredResources.length ? (
              <Option key={'no-items'} value={NO_ITEM_VALUE} disabled>
                {searchTerm.trim() ? `${intlText.NO_RESULTS} "${searchTerm}"` : intlText.NO_ITEMS}
              </Option>
            ) : (
              filteredResources.map((resource) => (
                <Option key={resource.id} value={resource.name}>
                  {resource.displayName}
                </Option>
              ))
            )}
          </Combobox>
        </Field>
      </div>
    </div>
  );
};
